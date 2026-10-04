import mongoose from "mongoose";

/** Database name defaults to `persian-poems`; `MONGODB_DB_NAME` lets a staging bot share the cluster with its own DB. */
const connectToDB = async (url: string): Promise<void> => {
  const dbName = process.env.MONGODB_DB_NAME?.trim() || "persian-poems";
  await mongoose.connect(url, { dbName });
  console.log(`Successfully connected to the database (${dbName})`);
};

export default connectToDB;
