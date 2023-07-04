import express from 'express'
const app = express()
import fetch from 'node-fetch'
import cors from 'cors'
import agoraToken from 'agora-token'
import pkg from 'agora-access-token';
const {RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole} = pkg;


import User from './models/User.js'
import mongoose from 'mongoose';
const dbUrl = "mongodb+srv://nagarjuna:test@cluster0.h7xyfty.mongodb.net/users?retryWrites=true&w=majority"; const connectionParams = {
  useNewUrlParser: true, useUnifiedTopology: true
};
const users = User.find()



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
    const all = await User.find()
    if (user && user.password === req.body.password) {
      const appToken = ChatTokenBuilder.buildAppToken(appId, appCertificate, expirationInSeconds);

      const userToken = ChatTokenBuilder.buildUserToken(appId, appCertificate, user.userUuid, expirationInSeconds);
      res
        .status(200)
        .json({
          code: "RES_OK",
          expireTimestamp: expirationInSeconds,
          chatUsername: req.body.account,
          accessToken: userToken, // agorachatAuthToken
          appToken:appToken ,
          users:all

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
    const nickname = req.body.nickname
    // const chatUsername = "<User-defined username>"
    // const chatPassword = "<User-defined password>"
    // const ChatNickname = "<User-defined nickname>"
    const chatUsername = account
    const chatPassword = password
    const ChatNickname = nickname


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


var role = RtcRole.PUBLISHER
var expirationTimeInSeconds = 86400

var generateRtcToken = function (req, resp) {
  var currentTimestamp = Math.floor(Date.now() / 1000)
  var privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds
  var channelName = req.query.channelName;
  // use 0 if uid is not specified
  var uid = req.query.uid || 0
  if (!channelName) {
      return resp.status(400).json({ 'error': 'channel name is required' }).send();
  }
  // if (!uid) {
  //     return resp.status(400).json({ 'error': 'uid  is required' }).send();
  // }


  var key = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);

  resp.header("Access-Control-Allow-Origin", "*")
  //resp.header("Access-Control-Allow-Origin", "http://ip:port")
  return resp.json({ 'token': key }).send();
};
var generateRtmToken = function (req, resp) {
  var currentTimestamp = Math.floor(Date.now() / 1000)
  var privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds
  var account = req.query.account;
  if (!account) {
      return resp.status(400).json({ 'error': 'account is required' }).send();
  }

  var key = RtmTokenBuilder.buildToken(appID, appCertificate, account, RtmRole, privilegeExpiredTs);

  resp.header("Access-Control-Allow-Origin", "*")
  //resp.header("Access-Control-Allow-Origin", "http://ip:port")
  return resp.json({ 'key': key }).send();
};
app.get('/rtcToken', generateRtcToken);
app.get('/rtmToken', generateRtmToken);

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
