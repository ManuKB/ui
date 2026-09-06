import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui/primitives';

export function NotFound() {
  return (
    <EmptyState
      icon={<Compass size={30} />}
      title="Page not found"
      hint="That route does not exist in the console."
      action={
        <Link to="/">
          <Button>Back to dashboard</Button>
        </Link>
      }
    />
  );
}
