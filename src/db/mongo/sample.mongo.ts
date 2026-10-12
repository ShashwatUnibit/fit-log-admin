import mongoose, { Model, Schema } from "mongoose";
import { iSample } from "../../interfaces/sample.interface";
import { cDbNames } from "../../consts/db.const";

type SampleModel = Model<iSample>;
const SampleSchema = new Schema<iSample>(
    {
        fullName: { type: String },
        mobileNumber: { type: String, unique: true, sparse: true, index: true },
        walletBalance: { type: Number, default: 0 },
    }
);

const SampleDb: SampleModel = mongoose.model<iSample>(cDbNames.sample, SampleSchema);
export default SampleDb;
