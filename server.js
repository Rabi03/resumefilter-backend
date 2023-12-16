const express = require('express');
const cors = require("cors");
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
 
dotenv.config()

const Resume = require('./routes/Resume');
const path = require('path');


process.on('uncaughtException', err => {
    console.log(err.stack)
    console.log('Server is sutting down due to uncaught exception')
    process.exit(1)
  })
  

  const app = express();
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json())
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.urlencoded({ extended: true }))
  app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  }));

  
  
  app.get("/", (req, res) => {
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