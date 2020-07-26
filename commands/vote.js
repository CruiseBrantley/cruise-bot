const fs = require('fs')
const logger = require('../logger')
let voteTopic = {}

function eligibleChannel (message) {
  // if (!(message.channel.id === "592718526083498014" || message.channel.id === "579568174392147968")) {
  // message.channel.send("This command can only be used from the designated voting channel.")
  // return false
  // }
  return true
}

function hasVoted (options, value) {
  for (let i = 0; i < options.length; i++) {
    const votedIndex = options[i].hasVoted.indexOf(value)
    if (votedIndex !== -1) {
      return [options[i].title, votedIndex, i]
    }
  }
  return ['not voted', -1, -1]
}

function vote (message, args) {
  voteTopic = JSON.parse(fs.readFileSync('./voteTopic.json'))
  if (!eligibleChannel(message)) return

  const options = voteTopic[message.channel.guild.id] || []

  if (args.length < 1) {
    return message.channel.send(
      `\`\`\`md\n# The current voting record is:\n${options
        .map(
          e =>
            String(`[${e.title}`).padEnd(50, ' ') + // eslint-disable-next-line
            `](Votes:	${e.hasVoted.length})\n`
        )
        .join('')}\`\`\``
    )
  }
  const vote = args.join(' ')

  const titleVotedFor = hasVoted(options, message.member.user.id)
  if (titleVotedFor[1] !== -1) {
    message.channel.send(
      `I'm sorry, you've already voted for \`${titleVotedFor[0]}\`.`
    )
    return
  }

  function findMatchIndex (vote) {
    let duplicate = false
    let found = -1
    for (let i = 0; i < options.length; i++) {
      if (options[i].title.toLowerCase().includes(vote.toLowerCase())) {
        if (found === -1) {
          found = i
        } else {
          duplicate = true
        }
      }
    }
    if (duplicate)
      return options.findIndex(
        item => item.title.toLowerCase() === vote.toLowerCase()
      )
    return found
  }

  const search = findMatchIndex(vote)
  if (search !== -1) {
    options[search].hasVoted.push(message.member.user.id)
    const votedFor = options[search].title
    message.channel.send(
      `Your vote for \`${votedFor}\` has been recorded, to see results use \`!vote\``
    )
    const sortedOptions = options.sort((item1, item2) =>
      parseInt(item1.hasVoted.length) < parseInt(item2.hasVoted.length) ? 1 : -1
    )
    fs.writeFile(
      process.env.VOTE_FILENAME,
      JSON.stringify(
        { ...voteTopic, [message.channel.guild.id]: sortedOptions },
        null,
        2
      ),
      err => {
        if (err) return logger.info(err)
        logger.info(`Recorded vote for ${votedFor}.`)
      }
    )
    return
  }
  message.channel.send("I couldn't find that option.")
}

function unvote (message, args) {
  voteTopic = JSON.parse(fs.readFileSync('./voteTopic.json'))
  if (!eligibleChannel(message)) return

  const options = voteTopic[message.channel.guild.id] || []

  const [, votedIndex, titleIndex] = hasVoted(options, message.member.user.id)
  if (titleIndex !== undefined && titleIndex !== -1) {
    options[titleIndex].hasVoted.splice(votedIndex, 1)
    fs.writeFile(
      process.env.VOTE_FILENAME,
      JSON.stringify(
        { ...voteTopic, [message.channel.guild.id]: options },
        null,
        2
      ),
      err => {
        if (err) return logger.info(err)
      }
    )
  } else {
    message.channel.send("You haven't even voted...")
    return
  }
  message.channel.send('Your vote has been reset.')
}

function votereset (message, args) {
  if (message.member.permissions.has('ADMINISTRATOR')) {
    voteTopic = JSON.parse(fs.readFileSync('./voteTopic.json'))
    const options = voteTopic[message.channel.guild.id] || []

    for (const option of options) {
      option.hasVoted = []
    }

    fs.writeFile(
      process.env.VOTE_FILENAME,
      JSON.stringify(
        { ...voteTopic, [message.channel.guild.id]: options },
        null,
        2
      ),
      err => {
        if (err) return logger.info(err)
        logger.info('Reset Votes.')
      }
    )
    message.channel.send('The vote count has been reset.')
    return
  }
  message.channel.send('You must have admin permissions to reset the vote.')
}

function voteadd (message, args) {
  if (message.member.permissions.has('ADMINISTRATOR')) {
    voteTopic = JSON.parse(fs.readFileSync('./voteTopic.json'))
    const options = voteTopic[message.channel.guild.id] || []

    if (args.length > 0) {
      args
        .join(' ')
        .split(',')
        .forEach(each => {
          if (
            options.findIndex(
              item => item.title.toLowerCase() === each.toLowerCase()
            ) === -1
          )
            options.push({ title: each.trim(), hasVoted: [] })
        })

      fs.writeFile(
        process.env.VOTE_FILENAME,
        JSON.stringify(
          { ...voteTopic, [message.channel.guild.id]: options },
          null,
          2
        ),
        err => {
          if (err) return logger.info(err)
        }
      )
      message.channel.send('Added successfully.')
    } else message.channel.send('You need to specify something to add.')
    return
  }
  message.channel.send(
    'You must have admin permissions to modify vote options.'
  )
}

function voteremove (message, args) {
  if (message.member.permissions.has('ADMINISTRATOR')) {
    voteTopic = JSON.parse(fs.readFileSync('./voteTopic.json'))
    const options = voteTopic[message.channel.guild.id] || []

    const toBeRemoved = args.join(' ')
    let flag = false
    if (args.length > 0) {
      for (let i = 0; i < options.length; i++) {
        if (options[i].title.toLowerCase() === toBeRemoved.toLowerCase()) {
          flag = true
          options.splice(i, 1)
        }
      }
      if (!flag) {
        message.channel.send(`Couldn't find ${toBeRemoved}.`)
        return
      }

      fs.writeFile(
        process.env.VOTE_FILENAME,
        JSON.stringify(
          { ...voteTopic, [message.channel.guild.id]: options },
          null,
          2
        ),
        err => {
          if (err) return logger.info(err)
          logger.info('Reset Votes.')
        }
      )
      message.channel.send(`\`${toBeRemoved}\` was removed successfully.`)
    } else message.channel.send('You need to specify something to remove.')
    return
  }
  message.channel.send(
    'You must have admin permissions to modify vote options.'
  )
}

function voteclear (message, args) {
  if (message.member.permissions.has('ADMINISTRATOR')) {
    voteTopic = JSON.parse(fs.readFileSync('./voteTopic.json'))
    fs.writeFile(
      process.env.VOTE_FILENAME,
      JSON.stringify({ ...voteTopic, [message.channel.guild.id]: [] }, null, 2),
      err => {
        if (err) return logger.info(err)
      }
    )
    message.channel.send('Cleared all options vote options.')
    return
  }
  message.channel.send(
    'You must have admin permissions to modify vote options.'
  )
}

module.exports = {
  vote,
  unvote,
  votereset,
  voteadd,
  voteremove,
  voteclear
}
