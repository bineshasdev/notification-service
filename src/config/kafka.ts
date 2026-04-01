import { Kafka, logLevel } from 'kafkajs'
import { env } from './env'
import { logger } from '../utils/logger'

export const kafka = new Kafka({
  clientId: env.KAFKA_CLIENT_ID,
  brokers:  env.KAFKA_BROKERS.split(','),
  logLevel: logLevel.WARN,
  logCreator: () => ({ namespace, level, label, log }) => {
    const { message, ...rest } = log
    if (level === logLevel.ERROR) logger.error(`[Kafka:${namespace}] ${message}`, rest)
    else if (level === logLevel.WARN) logger.warn(`[Kafka:${namespace}] ${message}`, rest)
  },
})

export const kafkaProducer = kafka.producer()
export const kafkaConsumer = kafka.consumer({ groupId: env.KAFKA_GROUP_ID })
