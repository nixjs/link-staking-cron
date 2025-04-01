import pino from 'pino'
import { table } from 'table'

const logger = pino({
    level: 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
        },
    },
})

export default logger

export function formatPoolInfoAsTable(data: {
    maxPoolSize: string | number
    totalStaked: string | number
    availableSpace: string | number
    unit: string
}): string {
    const tableData = [
        ['Metric', 'Value'],
        ['Pool Size', `${data.maxPoolSize} ${data.unit}`],
        ['Total Staked', `${data.totalStaked} ${data.unit}`],
        ['Available Space', `${data.availableSpace} ${data.unit}`],
    ]

    return table(tableData, {
        border: {
            topBody: `─`,
            topJoin: `┬`,
            topLeft: `┌`,
            topRight: `┐`,
            bottomBody: `─`,
            bottomJoin: `┴`,
            bottomLeft: `└`,
            bottomRight: `┘`,
            bodyJoin: `│`,
            bodyLeft: `│`,
            bodyRight: `│`,
            joinBody: `─`,
            joinLeft: `├`,
            joinRight: `┤`,
            joinJoin: `┼`,
        },
    })
}
