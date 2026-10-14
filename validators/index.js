export * from "./authValidator.js";
export * from "./roleValidator.js";
export * from "./userValidator.js";

import * as authValidator from "./authValidator.js";
import * as roleValidator from "./roleValidator.js";
import * as userValidator from "./userValidator.js";

export { authValidator, roleValidator, userValidator };
export default {
  auth: authValidator,
  role: roleValidator,
  user: userValidator,
};
