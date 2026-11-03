import mongoose, { Model, Schema } from "mongoose";
import { iNotificationTemplate } from "../../interfaces/notification.interface";
import { cDbNames } from "../../consts/db.const";

type NotificationTemplateModel = Model<iNotificationTemplate>;

const NotificationTemplateSchema = new Schema<iNotificationTemplate>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        name: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true },
        body: { type: String, required: true, trim: true },
        imageUrl: { type: String, default: null },
        screen: { type: String, default: null },
        url: { type: String, default: null },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: cDbNames.notificationTemplate,
    }
);

const NotificationTemplateDb: NotificationTemplateModel = mongoose.model<iNotificationTemplate>(
    cDbNames.notificationTemplate,
    NotificationTemplateSchema,
    cDbNames.notificationTemplate
);

export default NotificationTemplateDb;
