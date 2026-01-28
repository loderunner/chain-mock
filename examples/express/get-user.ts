import { Request, Response } from 'express';

export async function handleGetUser(req: Request, res: Response) {
  const id = req.params.id;
  if (id === '42') {
    res.json({ id: req.params.id, name: 'Dan' });
    return;
  }
  res.status(404).json({ error: 'User not found' });
}
