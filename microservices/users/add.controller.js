import * as userService from '../../shared/services/user.service.js';

// 201 means something new was created
const HTTP_CREATED = 201;

// api that adds a user
export async function add(req, res) {
  const user = await userService.addUser(req.body);

  res.status(HTTP_CREATED).json(user);
}
