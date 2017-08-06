# Jobs Timeline Widget for Oracle

### About


### Quick Start
View
```
use r0di0n0v\orajobs\OraJobsWidget;
echo OraJobsWidget::widget([
    'url' => Url::to(['ora_jobs/get_jobs'])
]);
```
Controller
```
use r0di0n0v\orajobs\actions\oraJobsAction;

class Ora_jobsController extends Controller
{
    public function actions () {
        return [
            'get_jobs' => [
                'class' => oraJobsAction::classname(),
                'owners' => ['ORACLE_SCHEME_OWNER'],
                'start_date' => new \DateTime('-2 day'),
                'end_date' => new \DateTime(),
            ]
        ]
    }    
}

```

### Configuration
Configuration parameters for Widget

| Parameter | Description |
| --------- | ----------- |
| Url | Data source url |


