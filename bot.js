var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});
bot.on('message', function (user, userID, channelID, message, evt) {
    if (message.substring(0, 2) == '/r') {
        var input = message.substring(3).trim();
		rollEvent = handle(input);
		
		bot.sendMessage({
			to: channelID,
			message: "<@" + userID + ">: " + rollEvent.output
		});
     }
});

function handle(input) {
	
	var commentTokenIndex = input.indexOf("#");
	var comment = "";
  
	if(commentTokenIndex > -1) {
	  comment = input.substring(commentTokenIndex + 1);
	  input = input.substring(0, commentTokenIndex - 1);
	}
	
	return parseArgs(input, comment);
}

//this takes an array of strings representing each argument
function parseArgs(input, comment) {
	var args = input.split(" ");
	var rollEvent = {
		input: input,
		comment: comment,
		diceNumber: -1,
		diceSides: -1,
		equalityOperator: null,
		successThreshold: -1,
		autoSuccesses: 0,
		multiplier: 1,
		dice: [],
		successCount: 0,
		bonusSuccessCount: 0,
		totalSuccessCount: 0,
		totalSuccessCountNoBonus: 0,
		faceValueSum: 0,
		output: null
	};
	
	try {
		
		if(args.length > 3) {
			throw(tooManyArgumentsMessage());
		}
		
		args.forEach(function(argument) {
			interpretArgument(argument, rollEvent);
		});
		
		executeRollEvent(rollEvent);
		printEvent(rollEvent);
	} catch(err) {
		rollEvent.output = err;
	}
	return rollEvent;
}

function invalidArgumentMessage(argument) {
	var flavor = [
		"Hey Copernicus, why don't you navigate yourself to the shitty command you just gave me.",
		"brb I need to find a 5 year old to translate what the fuck you just tried to ask me to do.",
		"Yeah, sorry. I'm a bot, not a mind reader.",
		"Maybe you should go back to Candy Crush."
	];
	var errorIdx = Math.floor(Math.random() * flavor.length);
	return flavor[errorIdx] + "\n\n" + "Unknown command: `" + argument + "`" + usage();
}

function tooManyArgumentsMessage() {
	return "You gave me way too many arguments. Lay off the coke there, chief." + usage();
}

function usage() {
	return "\n\nUsage: \n"
	+ "Roll 5 d10:                          \t5d10>=7\n"
	+ "Add 5 auto successes:     \t5d10>=7 5a\n"
	+ "Multiply successes by 2: \t5d10>=7 x2\n"
	+ "Put it all together:             \t5d10>=7 5a x2\n"
	+ "OR:                                      \t5d10>=7 x2 5a\n";
}

function interpretArgument(argument, rollEvent) {
	switch(argument) {
		//dice argument
		case (argument.match(/^\d+d\d+[>=<]*\d*$/) || {}).input:
			rollEvent.diceNumber = parseInt(argument.match(/\d+(?=d)/), 10);
			rollEvent.diceSides = parseInt(argument.match(/(?<=d)\d+/), 10);
			rollEvent.equalityOperator = argument.match(/[<=>]+/);
			if(rollEvent.equalityOperator) {
				rollEvent.equalityOperator = rollEvent.equalityOperator[0];
			}
			rollEvent.successThreshold = parseInt(argument.match(/(?<=[<=>]+)\d+/), 10);
			break;
		//auto suxx argument
		case (argument.match(/^\d+[Aa]$/) || {}).input:
			rollEvent.autoSuccesses = parseInt(argument.match(/\d+(?=[Aa])/), 10);
			break;
		//multiplier argument
		case (argument.match(/^[Xx]\d+$/) || {}).input:
			rollEvent.multiplier = parseInt(argument.match(/(?<=[xX])\d+/));
			break;
		default:
			throw(invalidArgumentMessage(argument));
			break;
	}
}

function executeRollEvent(rollEvent) {
	
	for(i = 0; i < rollEvent.diceNumber; i++) {
		rollEvent.dice.push(roll(rollEvent));
	}
	
	calculateTotals(rollEvent);
}

function roll(rollEvent) {
	var diceValue = Math.floor(Math.random() * rollEvent.diceSides) + 1;
	
	var dice = {
		faceValue: diceValue,
		success: false
	};
	
	switch(rollEvent.equalityOperator) {
		case ">":
			dice.success = dice.faceValue > rollEvent.successThreshold;
			break;
		case "<":
			dice.success = dice.faceValue < rollEvent.successThreshold;
			break;
		case "<=":
			dice.success = dice.faceValue <= rollEvent.successThreshold;
			break;
		case ">=":
			dice.success = dice.faceValue >= rollEvent.successThreshold;
			break;
		default:
			//console.log(rollEvent.equalityOperator);
	}
	
	return dice;
}

function calculateTotals(rollEvent) {

	rollEvent.successCount = rollEvent.dice.filter(dice => dice.success == true).length;
	rollEvent.bonusSuccessCount = rollEvent.dice.filter(dice => dice.faceValue == 10).length;
	rollEvent.totalSuccessCount = (rollEvent.successCount + rollEvent.bonusSuccessCount + rollEvent.autoSuccesses) * rollEvent.multiplier;
	rollEvent.totalSuccessCountNoBonus = (rollEvent.successCount + rollEvent.autoSuccesses) * rollEvent.multiplier;
	
	var faceValueSum = 0;
	rollEvent.dice.forEach(function(dice) {
		faceValueSum += dice.faceValue;
	});

	rollEvent.faceValueSum = faceValueSum;
}

function printEvent(rollEvent) {
	rollEvent.output = "`" + rollEvent.input + "`";
	
	if(rollEvent.comment) {
		rollEvent.output += " " + rollEvent.comment;
	}
	rollEvent.output += " = (";
	
	if(rollEvent.equalityOperator) {
		printWithSuccesses(rollEvent);
	} else {
		printWithoutSuccesses(rollEvent);
	}
}

function printWithSuccesses(rollEvent) {
	
	for (i = 0; i < rollEvent.dice.length; i++) {
		
		if(rollEvent.dice[i].success) {
			rollEvent.output += rollEvent.dice[i].faceValue;
		} else {
			rollEvent.output += "~~" + rollEvent.dice[i].faceValue.toString() + "~~";
		}
		if(i != rollEvent.dice.length - 1) {
			rollEvent.output += " ";
		} else {
			rollEvent.output += ", ";
		}
	}
	
	var rolledSuccesses = rollEvent.successCount + rollEvent.bonusSuccessCount;
	
	rollEvent.output += rolledSuccesses + " successes)";
	
	if(rollEvent.autoSuccesses > 0) {
		rollEvent.output += " + " + rollEvent.autoSuccesses + " auto";
	}
	
	if(rollEvent.multiplier > 1) {
		rollEvent.output += " x " + rollEvent.multiplier;
	}
	
	rollEvent.output += " = " + rollEvent.totalSuccessCount + " (" + rollEvent.totalSuccessCountNoBonus + ") total successes";
}

function printWithoutSuccesses(rollEvent) {
	
	for (i = 0; i < rollEvent.dice.length; i++) {
		rollEvent.output += rollEvent.dice[i].faceValue;
		if(i != rollEvent.dice.length - 1) {
			rollEvent.output += "+";
		} else {
			rollEvent.output += ") = " + rollEvent.faceValueSum;
		}
	}
}