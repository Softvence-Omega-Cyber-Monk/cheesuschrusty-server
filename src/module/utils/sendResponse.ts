import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';

type TResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string;
  data: T;
};

const bigintReplacer = (_key: string, value: unknown) => {
  if (typeof value === 'bigint') {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
      ? Number(value)
      : value.toString();
  }
  return value;
};

const sendResponse = <T>(res: Response, data: TResponse<T>) => {
  const serialized = JSON.parse(JSON.stringify(
    {
      statusCode: data?.statusCode,
      success: data?.success,
      message: data?.message,
      data: data.data,
    },
    bigintReplacer,
  ));

  res.status(data?.statusCode).json(serialized);
};

export default sendResponse;
