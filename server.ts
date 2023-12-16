import express,{Express,Request,Response} from 'express';
import cors from "cors";
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
 
dotenv.config()

import Resume from './routes/Resume';


process.on('uncaughtException', err => {
    console.log(err.stack)
    console.log('Server is sutting down due to uncaught exception')
    process.exit(1)
  })
  

  const app:Express = express();
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json())
  app.use(express.static('public'));
  app.use(express.urlencoded({ extended: true }))
  app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  }));

  
  
  app.get("/", (req:Request, res:Response) => {
    res.status(200).json({
      status: "success",
      ipAddress: req.ip,
      message: "Welcome to the API",
    });
  });
  

  app.use("/api",Resume)

  
  
  

  
  
  const server = app.listen(process.env.PORT || 5000, () => console.log(`Server is running on Port: 5000`))
  
  process.on('unhandledRejection', err => {
    console.log(err)
    console.log('Server is sutting down due to unhandled rejection')
    server.close(() => process.exit(1))
  })