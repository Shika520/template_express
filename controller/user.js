'use strict'

import UserModel from '../models/user'
import dateAndTime from 'date-and-time'
import constant from '../constant/constant'
import jsonwebtoken from 'jsonwebtoken'
import redisManager from '../config/redis'

class User {
  constructor () {
    this.login = this.login.bind(this)
    this.getUserInfo = this.getUserInfo.bind(this)
    this.logout = this.logout.bind(this)
  }

  /**
 *
 * @api {post} /api/login  登录
 * @apiName 登录
 * @apiGroup user
 * @apiVersion 1.0.0
 * @apiDescription 接口详细描述
 *
 * @apiParam {String} username 用户名
 *
 * @apiSuccess {String} code 结果码
 * @apiSuccess {String} message 消息说明
 * 
 * @apiSuccessExample {json}Success-Response:
 *  HTTP/1.1 200 OK
 * {
 *   code: 0,
 *   message: 'success',
 *   data: {}
 * }
 *
 *  @apiErrorExample {json} Error-Response:
 *  HTTP/1.1 200
 *  {
 *   code: 0,
 *   message: 'user not found',
 *  }
 */
  async login (req, res) {
    let role = 0 // 0代表普通用户 1代表管理员
    let username = req.body.username
    let password = req.body.password
    const tokenObj = {
      username
    }
    try {
      if (!username) {
        throw new Error('用户不能为空')
      } else if (!password) {
        throw new Error('密码不能为空')
      }
    } catch (err) {
      res.json({
        status: 0,
        message: err.message
      })
      return
    }
    if (username === 'admin') {
      role = 1
    }
    // 先查一遍看看是否存在
    let user = await UserModel.findOne({username})
    let token = jsonwebtoken.sign(tokenObj, constant.secretKey)
    if (user) {
      // 用户已存在 去登录
      let userInfo = await UserModel.findOne({
        username,
        password
      })
      if (userInfo) {
        redisManager.set(token, username)
        res.json({
          status: 200,
          message: '登录成功',
          data: token
        })
      } else {
        res.json({
          status: 0,
          message: '登录失败,用户名或密码错误'
        })
      }
    } else {
      let arr = await UserModel.find()
      let newUser = {
        username,
        password,
        role,
        createTime: dateAndTime.format(new Date(), "YYYY/MM/DD HH:mm:ss"),
        id: arr.length + 1
      }
      try {
        UserModel.create(newUser, (err) => {
          if (err) {
            res.json({
              status: 0,
              message: '注册失败'
            })
          } else {
            redisManager.set(token, username)
            res.json({
              status: 200,
              message: '注册成功',
              data: token
            })
          }
        })
      } catch (err) {
        res.json({
          status: 0,
          message: err.message
        })
      }
    }
  }

  async getUserInfo (req, res) {
    let userInfo = await UserModel.findOne({username: req.user.username}, {'_id': 0, '_v': 0})
    if (userInfo) {
      res.json({
        status: 200,
        message: '查询成功',
        data: userInfo
      })
    } else {
      res.json({
        status: 0,
        message: '查询失败'
      })
    }
  }
  
  async logout (req, res) {
    // 清楚redis中的token
    res.json({
      status: 200,
      message: '登出成功'
    })
    redisManager.remove(req)
  }
}

export default new User()
