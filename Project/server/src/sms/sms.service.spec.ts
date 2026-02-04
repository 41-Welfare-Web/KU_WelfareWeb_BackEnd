import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from './sms.service';
import { InternalServerErrorException } from '@nestjs/common';

// Mock coolsms-node-sdk
jest.mock('coolsms-node-sdk', () => {
  return jest.fn().mockImplementation(() => {
    return {
      sendOne: jest.fn().mockResolvedValue({ statusCode: '2000', statusMessage: '정상 접수' }),
    };
  });
});

import coolsms from 'coolsms-node-sdk';

describe('SmsService', () => {
  let service: SmsService;

  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules(); // Reset cache to reload Env vars
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should be in MOCK mode if keys are missing', async () => {
    delete process.env.SOLAPI_API_KEY;
    delete process.env.SOLAPI_API_SECRET;
    delete process.env.SOLAPI_SENDER_NUMBER;

    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsService],
    }).compile();

    service = module.get<SmsService>(SmsService);
    // @ts-ignore
    expect(service.isMock).toBe(true);

    const spy = jest.spyOn(console, 'log').mockImplementation();
    await service.sendSMS('01012345678', 'Test Message');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[MOCK SMS (Solapi)]'));
    spy.mockRestore();
  });

  it('should use REAL SDK if keys are present', async () => {
    process.env.SOLAPI_API_KEY = 'test-key';
    process.env.SOLAPI_API_SECRET = 'test-secret';
    process.env.SOLAPI_SENDER_NUMBER = '01012345678';

    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsService],
    }).compile();

    service = module.get<SmsService>(SmsService);
    // @ts-ignore
    expect(service.isMock).toBe(false);

    // Get the mock instance from the service
    // @ts-ignore
    const mockSendOne = service.messageService.sendOne;

    const result = await service.sendSMS('01099999999', 'Real Message');
    expect(result).toBe(true);
    expect(mockSendOne).toHaveBeenCalledTimes(1);
    expect(mockSendOne).toHaveBeenCalledWith(expect.objectContaining({
      to: '01099999999',
      text: 'Real Message'
    }));
  });

  it('should throw error if SDK call fails', async () => {
    process.env.SOLAPI_API_KEY = 'test-key';
    process.env.SOLAPI_API_SECRET = 'test-secret';
    process.env.SOLAPI_SENDER_NUMBER = '01012345678';

    // Mock failure
    const mockCoolSms = coolsms as unknown as jest.Mock;
    mockCoolSms.mockImplementationOnce(() => ({
      sendOne: jest.fn().mockRejectedValue(new Error('API Error')),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsService],
    }).compile();

    service = module.get<SmsService>(SmsService);

    await expect(service.sendSMS('01099999999', 'Fail Message')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});