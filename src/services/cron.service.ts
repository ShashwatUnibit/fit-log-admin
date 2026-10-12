import { CronJob } from "cron";
import { cEnv } from "../consts/env.const";

export default class CronJobsService {
    public static instance: CronJobsService = new CronJobsService();
    private readonly everyMinuteCron = "* * * * *";
    private readonly every20SecondCron = "*/20 * * * * *";
    private readonly everyDayCron = "0 0 * * *";
    private jobs: CronJob[] = [];

    private constructor() { }

    public initializeCronJobs(): void {
        const instanceName = process.env.SERVER_INSTANCE_NAME ?? process.env.name ?? "";
        if (cEnv.SERVER_ENV !== "dev" && instanceName !== cEnv.SERVER_PRIMARY_INSTANCE_NAME) {
            return;
        }

        this.jobs = [
            new CronJob(this.everyMinuteCron, () => { /* empty */ }, null, false, "Asia/Kolkata"),
            new CronJob(this.everyDayCron, () => { /* empty */ }, null, false, "Asia/Kolkata"),
            new CronJob(this.every20SecondCron, () => { /* empty */ }, null, false, "Asia/Kolkata"),
        ];

        for (const job of this.jobs) {
            job.start();
        }
    }

    public stopCronJobs(): void {
        for (const job of this.jobs) {
            job.stop();
        }
    }
}
