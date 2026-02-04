const mongoose = require("mongoose");

async function connectDb(uri) {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => console.log("[db] connected"));
  mongoose.connection.on("error", (err) => console.error("[db] error", err));
  mongoose.connection.on("disconnected", () => console.log("[db] disconnected"));

  await mongoose.connect(uri, {
    autoIndex: true,
  });
}

module.exports = { connectDb };
