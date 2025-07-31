import { signUp, login, logout } from './auth';
import api from './api';
import Cookies from 'js-cookie';
import { Parent } from '../types/auth';

jest.mock('./api');
jest.mock('js-cookie');

const mockedApi = api as jest.Mocked<typeof api>;
const mockedCookies = Cookies as jest.Mocked<typeof Cookies>;

const mockParent: Parent = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
};

const mockAuthResponse = {
  data: {
    token: 'test-token',
    parent: mockParent,
  },
};

describe('Auth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sign up a user and set a cookie', async () => {
    mockedApi.post.mockResolvedValue(mockAuthResponse);

    const parent = await signUp('Test User', 'test@example.com', 'password');

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/signup', {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password',
    });
    expect(mockedCookies.set).toHaveBeenCalledWith('token', 'test-token', { expires: 1, secure: false });
    expect(parent).toEqual(mockParent);
  });

  it('should log in a user and set a cookie', async () => {
    mockedApi.post.mockResolvedValue(mockAuthResponse);

    const parent = await login('test@example.com', 'password');

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password',
    });
    expect(mockedCookies.set).toHaveBeenCalledWith('token', 'test-token', { expires: 1, secure: false });
    expect(parent).toEqual(mockParent);
  });

  it('should log out a user by removing the cookie', () => {
    logout();
    expect(mockedCookies.remove).toHaveBeenCalledWith('token');
  });
}); 