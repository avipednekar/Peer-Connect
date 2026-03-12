console.log("meta.dirname:", import.meta.dirname);
import dotenv from "dotenv";
const p = import.meta.dirname + "/../.env";
console.log("path:", p);
dotenv.config({ path: p });
console.log("URI:", process.env.MONGODB_URI);
