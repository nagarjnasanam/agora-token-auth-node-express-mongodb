import express from 'express'
const app = express()
import fetch from 'node-fetch'
import cors from 'cors'
import agoraToken from 'agora-token'
import User from './models/User.js'
import mongoose from 'mongoose';
const dbUrl = "mongodb+srv://nagarjuna:test@cluster0.h7xyfty.mongodb.net/users?retryWrites=true&w=majority"; const connectionParams = {
  useNewUrlParser: true, useUnifiedTopology: true
};
const users = User.find()

// mongoose.connect(dbUrl, connectionParams).then(
//   () => {
//     console.info("db connected");
//   }
// ).catch(
//   (e) => {
//     console.log("error occues", e);
//   })

const { ChatTokenBuilder } = agoraToken

const hostname = '127.0.0.1'
const port = 3006

// Get the appId and appCertificate from the agora console
const appId = "6fa37398a5be49d187db7c4f060d8530";
const appCertificate = "9c60fefeaf90412c907b4d486706ffac";
// Token expire time, hardcode to 86400 seconds = 1 day
const expirationInSeconds = 86400;

// Get the RestApiHost, OrgName and AppName from the chat feature in agora console
const chatRegisterURL = "https://a41.chat.agora.io/41975973/1139922/users"

app.use(cors())
app.use(express.json())

app.post('/login', async (req, res) => {
  await mongoose.connect(dbUrl, connectionParams).then(async () => {
    console.log(users)
    const user = await User.findOne({ account: req.body.account })
    if (user && user.password === req.body.password) {
      const userToken = ChatTokenBuilder.buildUserToken(appId, appCertificate, user.userUuid, expirationInSeconds);
      res
        .status(200)
        .json({
          code: "RES_OK",
          expireTimestamp: expirationInSeconds,
          chatUsername: user,
          accessToken: userToken, // agorachatAuthToken

        })
    } else {
      res.status(401).json({
        message: 'You account or password is wrong'
      })
    }
  })

})

app.post('/register', async (req, res) => {

  await mongoose.connect(dbUrl, connectionParams).then(async () => {

    const account = req.body.account
    const password = req.body.password
    // const chatUsername = "<User-defined username>"
    // const chatPassword = "<User-defined password>"
    // const ChatNickname = "<User-defined nickname>"
    const chatUsername = account
    const chatPassword = password
    const ChatNickname = account
    

    const body = { 'username': chatUsername, 'password': chatPassword, 'nickname': ChatNickname };
    const appToken = ChatTokenBuilder.buildAppToken(appId, appCertificate, expirationInSeconds);
    const response = await fetch(chatRegisterURL, {
      method: 'post',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer ' + appToken,
      },
      body: JSON.stringify(body)
    })
    const result = await response.json()
    if (response.status != 200) {
      res.status(400).json({ success: false, data: result })
      return
    }
    try {
      const user = await User.create({
        "account": account,
        "password": password,
        "chatUsername": chatUsername,
        "userUuid": result.entities[0].uuid
      })
      user.save()
      res.status(200).json({ success: true, message: "User Registered Sucessfully !", "code": "RES_OK" })
    } catch (error) {
      console.log(error)
      res.status(400).json({ success: false })
    }
  })


})

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
