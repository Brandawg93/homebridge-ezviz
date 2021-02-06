import { auth } from '../src/ezviz/connection';

interface Credentials {
  domain: string;
  email: string;
  password: string;
}

const getCredentials = (): Credentials => {
  const domain = process.env.DOMAIN;
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;
  if (!domain || !email || !password) {
    throw new Error('Invalid credentials');
  }
  return { domain: domain, email: email, password: password };
};

test('works as expected', async () => {
  const credentials = getCredentials();
  expect.assertions(1);
  const accessToken = await auth(credentials.domain, credentials.email, credentials.password);
  expect(accessToken.length > 0).toBeTruthy();
});
