import { redirect } from 'next/navigation';

export default function HomePage() {
  // Send the base path to the main dashboard screen to avoid a 404 on "/".
  redirect('/officers');
}
