import { createFileRoute } from '@tanstack/react-router';
import { TermPage } from '../components/TermPage';
import { useSchedule } from '../services/scheduleContext';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  const schedule = useSchedule();
  return <TermPage schedule={schedule} />;
}
