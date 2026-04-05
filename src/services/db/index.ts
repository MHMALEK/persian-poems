import mongoose from "mongoose";

const connectToDB = async (url: string): Promise<void> => {
  await mongoose.connect(url, { dbName: "persian-poems" });
  console.log("Successfully connected to the database");
};

export default connectToDB;
