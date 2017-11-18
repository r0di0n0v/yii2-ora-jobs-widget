<?php

namespace r0di0n0v\orajobs\actions;

use yii\base\Action;
use yii\base\InvalidConfigException;

class OraJobsAction extends Action
{

    public $start_date;
    public $end_date;
    public $owners;

    /**
     * @inheritdoc
     */
    public function init()
    {
        if (is_a($this->start_date, 'DateTime') === false) {
            throw new InvalidConfigException('start_date must be a DateTime object');
        }
        if (is_a($this->end_date, 'DateTime') === false) {
            throw new InvalidConfigException('end_date must be a DateTime object');
        }
        if (is_array($this->owners) === false) {
            throw new InvalidConfigException('owners must be a Array object');
        } else {
            if (count($this->owners) == 0) {
                throw new InvalidConfigException('owners empty');
            }
        }
    }

    /**
     * @inheritdoc
     */
    public function run()
    {
        $sql = <<<SQL
SELECT
    sj.owner,
    sj.JOB_NAME,
    (CAST(SYS_EXTRACT_UTC(sjd.ACTUAL_START_DATE) AS DATE) - to_date('01011970', 'DDMMYYYY'))*24*60*60*1000 SDATE,
    (CAST(SYS_EXTRACT_UTC(sjd.ACTUAL_START_DATE + sjd.RUN_DURATION) AS DATE) - to_date('01011970', 'DDMMYYYY'))*24*60*60*1000 EDATE,
    case when sjd.ERRORS is not null then 1 else 0 end ERR
FROM
    all_scheduler_job_run_details sjd,
    all_scheduler_jobs sj
WHERE 1=1
    AND sj.JOB_NAME = sjd.JOB_NAME(+)
    AND sj.owner = sjd.owner(+)
    AND sj.owner in (:OWNER)
    and sj.ENABLED = 'TRUE'
    AND sjd.ACTUAL_START_DATE >= TO_DATE(:SDATE, 'DD.MM.YYYY HH24:MI:SS')
    AND sjd.ACTUAL_START_DATE < TO_DATE(:EDATE, 'DD.MM.YYYY HH24:MI:SS')
SQL;
        $params = [
            ':SDATE' => $this->start_date->format('d.m.Y H:i:s'),
            ':EDATE' => $this->end_date->format('d.m.Y H:i:s'),
        ];

        $param_owner_bind_keys = [];
        foreach ($this->owners as $key => $owner) {
            $param_owner_bind_keys[] = ":OWNER_$key";
            $params[":OWNER_$key"] = $owner;
        }
        $sql = str_replace(':OWNER', implode(',', $param_owner_bind_keys), $sql);

        $res = \Yii::$app->db->createCommand($sql, $params)->queryAll();

        $len = count($res);
        $data = ['labels' => [], 'rows' => []];
        $map_label_to_id = [];
        $idx = 0;

        for ($i = 0; $i < $len; $i++) {
            if (!isset($map_label_to_id[ $res[$i]['JOB_NAME'] ])) {
                $map_label_to_id[ $res[$i]['JOB_NAME'] ] = $idx;
                $data['labels'][$idx] = $res[$i]['JOB_NAME'];
                $idx++;
            }
            $data['rows'][] = [
                'id'=> $map_label_to_id[ $res[$i]['JOB_NAME'] ],
                's' => $res[$i]['SDATE'],
                'e' => $res[$i]['EDATE'],
                'res' => ($res[$i]['ERR'] == 1 ? 'fail' : 'success' )
            ];

        }
        return json_encode($data);
    }

}