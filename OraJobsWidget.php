<?php


namespace r0di0n0v\orajobs;

use yii\base\Widget;
use yii\helpers\Html;

use r0di0n0v\orajobs\assets\OraJobsAsset;

class OraJobsWidget extends Widget
{
    private $uid = '0';

    public $url = '';

    public $min_bar_width = 2;

    public function init()
    {
        parent::init();

        $this->uid = "ora-jobs-".uniqid();
    }

    public function run()
    {
        $view = $this->getView();
        OraJobsAsset::register( $view );
        $view->registerJs("new Chart({selector:'.". $this->uid ."', url:'". $this->url ."', min_bar_width: ". $this->min_bar_width ."})");

        return Html::tag('div', '', [
            'class' => "ora-jobs ".$this->uid
        ]);
    }
}