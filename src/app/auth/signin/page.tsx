import SignInPage from './components/SigninPage';
type Props = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};
export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  return <SignInPage searchParams={params} />;
}
