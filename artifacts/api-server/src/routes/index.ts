import { Router, type IRouter } from "express";
import healthRouter from "./health";
import booksRouter from "./books";
import adminRouter from "./admin";
import audioProxyRouter from "./audio-proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/books", booksRouter);
router.use("/admin", adminRouter);
router.use("/audio-proxy", audioProxyRouter);

export default router;
