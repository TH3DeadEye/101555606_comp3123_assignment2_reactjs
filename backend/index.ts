import { createApp } from './app';

const port = Number(process.env.PORT ?? 5001);

createApp().listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
