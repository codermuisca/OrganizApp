import TaskBoard from './task-board';
import { requireChatGPTUser } from './chatgpt-auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await requireChatGPTUser('/');
  return <TaskBoard user={{ name: user.displayName, email: user.email }} />;
}
