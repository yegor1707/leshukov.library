import { Router, type IRouter } from "express";
import healthRouter from "./health";
import booksRouter from "./books";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/books", booksRouter);

export default router;
