import { Router } from "express";
import authRoutes from "./authRoutes.js";
import roleRoutes from "./roleRoutes.js";
import userRoutes from "./userRoutes.js";

const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/roles", roleRoutes);
apiRouter.use("/users", userRoutes);

export { authRoutes, roleRoutes, userRoutes, apiRouter };
export default apiRouter;
