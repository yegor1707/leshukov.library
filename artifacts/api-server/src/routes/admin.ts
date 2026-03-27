import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/login", (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || "1707";

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: "Неверный пароль" });
    return;
  }

  res.json({ ok: true });
});

export default router;
