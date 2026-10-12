export default class DateModule {
    public static instance: DateModule = new DateModule();
    private constructor() {}

    public getCurrentTimestamp(): number {
        return Date.now();
    }

    public getCurrentDateTime(): Date {
        return new Date(this.getCurrentTimestamp());
    }

    public getCurrentDateOnly(): string {
        const dateNow = this.getCurrentDateTime();
        const day = dateNow.getUTCDate().toString().padStart(2, "0");
        const month = (dateNow.getUTCMonth() + 1).toString().padStart(2, "0");
        const year = dateNow.getUTCFullYear().toString();
        return `${day}-${month}-${year}`;
    }
}
