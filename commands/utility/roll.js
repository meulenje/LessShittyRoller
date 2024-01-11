const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('r')
		.addStringOption(option =>
			option
				.setName('command')
				.setRequired(true)
				.setDescription('Roller command'))
		.setDescription('Rolls dice pour vous'),
	async execute(interaction) {
		const command = interaction.options.getString('command');
		await interaction.reply(handle(command));
	},
};

function handle(input) {
	console.log(input)
	var commentTokenIndex = input.indexOf("#");
	var comment = "";
  
	if(commentTokenIndex > -1) {
	  comment = input.substring(commentTokenIndex + 1);
	  input = input.substring(0, commentTokenIndex - 1);
	}
	
	return parseArgs(input, comment);
}

function getDefenseRoll(dice) {
	successes = 0;
	ones = 0;
	if (dice < 1) {
		return 0;
	}
	for (i = 0; i < dice; i++) {
		die = Math.floor(Math.random() * 10) + 1
		if (die == 1) {
			ones -= 1;
		} else if (die >= 7) {
			successes += 1;
		}
		if (die == 10) {
			successes += 1;
		}
	}
	if (successes == 0) {
		return ones;
	} else {
		return successes;
	}


}

//this takes an array of strings representing each argument
function parseArgs(input, comment) {
	var args = input.split(" ");
	console.log('args: ' + args);
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
		cascade: 1,
		cascadeDice: [],
		cascadeSuccesses: [],
		defense: -1,
		defenseSuccesses: [],
		dif: 0,
		multitask: 0,
		faceValueSum: 0,
		bonusThreshold: 10,
		output: null
	};
	
	try {

		if (args.length > 7) {
			throw (tooManyArgumentsMessage());
		}

		args.forEach(function (argument) {
			interpretArgument(argument, rollEvent);
		});
		executeRollEvent(rollEvent);
		startDice = rollEvent.diceNumber;
		for (c = 1; c < rollEvent.cascade; c++) {
			if (rollEvent.multitask == 1) {
				rollEvent.diceNumber = startDice - Math.floor((c / 2));
			} else {
				rollEvent.diceNumber = startDice - c;
			}
			rollEvent.dice = [];
			rollEvent.successCount = 0;
			rollEvent.totalSuccessCount = 0;
			rollEvent.totalSuccessCountNoBonus = 0;
			rollEvent.onesCount = 0;
			if (rollEvent.diceNumber < 1) {
				break;
			}
			executeRollEvent(rollEvent);
		}
		if (rollEvent.cascade > 1) {
			printCascade(rollEvent);
		} else {
			printEvent(rollEvent);
		}
	} catch(err) {
		rollEvent.output = err;
	}
	return rollEvent.output;
}

function invalidArgumentMessage(argument) {
	var flavor = [
		"Hey Copernicus, why don't you navigate yourself to the shitty command you just gave me.",
		"brb I need to find a 5 year old to translate what the fuck you just tried to ask me to do.",
		"Yeah, sorry. I'm a bot, not a mind reader.",
		"Maybe you should go back to Candy Crush."
	];
	var errorIdx = Math.floor(Math.random() * flavor.length);
	return flavor[errorIdx] + "\n\n" + "Unknown command: `" + argument + "`\n\n" + usage();
}

function tooManyArgumentsMessage() {
	return "You gave me way too many arguments. Lay off the coke there, chief." + usage();
}

function usage() {
	return "`\n\n" 
	+ "Usage:\n"
	+ "Roll 5 d10:                 \t/r 5d10>=7 \n"
	+ "Add 5 auto successes:       \t/r 5d10>=7 5a \n"
	+ "Multiply successes by 2:    \t/r 5d10>=7 x2 \n"
	+ "Count 8s, 9s, and 10s twice:\t/r 5d10>=7 b8 \n"
	+ "Cascade 3 attacks:          \t/r 5d10>=7 3c \n"
	+ "Cascade with multi-tasking: \t/r 5d10>=7 3cm \n"
	+ "Roll enemy dodge of 6 dice: \t/r 5d10>=7 6d \n"
	+ "Subtract 3 sux (Roll Dif+3):\t/r 5d10>=7 dif3 \n"
	+ "Put it all together:        \t/r 5d10>=7 5a x2 \n"
	+ "OR:                         \t/r 5d10>=7 x2 5a\n"
	+ "8 multi-task headshots vs 9 dodge:     \t/r 14d10>=7 8cm dif3 9d\n"
	+ "`";
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
			rollEvent.multiplier = parseInt(argument.match(/(?<=[Xx])\d+/));
			break;
		//bonus threshold argument
		case (argument.match(/^[Bb]\d+$/) || {}).input:
			rollEvent.bonusThreshold = parseInt(argument.match(/(?<=[Bb])\d+/));
			break;
		// difficulty argument
		case (argument.match(/^[Dd]if\d+$/) || {}).input:
			rollEvent.dif = parseInt(argument.match(/(?<=[Dd]if)\d+/));
			break;
		// cascading roll with multi-tasking argument
		case (argument.match(/^\d+[Cc][Mm]$/) || {}).input:
			rollEvent.cascade = parseInt(argument.match(/\d+(?=[Cc][Mm])/), 10);
			rollEvent.multitask = 1;
			break;
		// cascading roll argument
		case (argument.match(/^\d+[Cc]$/) || {}).input:
			rollEvent.cascade = parseInt(argument.match(/\d+(?=[Cc])/), 10);
			break;
		// defense argument
		case (argument.match(/^\d+[Dd]$/) || {}).input:
			rollEvent.defense = parseInt(argument.match(/\d+(?=[Dd])/), 10);
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
			console.log('No operator provided');
	}
	
	return dice;
}

function calculateTotals(rollEvent) {

	rollEvent.successCount = rollEvent.dice.filter(dice => dice.success == true).length;
	rollEvent.bonusSuccessCount = rollEvent.dice.filter(dice => dice.faceValue >= rollEvent.bonusThreshold).length;
	rollEvent.totalSuccessCount = (rollEvent.successCount + rollEvent.bonusSuccessCount + rollEvent.autoSuccesses) * rollEvent.multiplier;
	rollEvent.totalSuccessCountNoBonus = (rollEvent.successCount + rollEvent.autoSuccesses) * rollEvent.multiplier;
	rollEvent.onesCount = rollEvent.dice.filter(dice => dice.faceValue == 1).length;

	if (rollEvent.cascade > -1) {
		rollEvent.cascadeDice.push(rollEvent.diceNumber);
		if (rollEvent.totalSuccessCount == 0 && rollEvent.onesCount > 0) {
			botch = 0 - rollEvent.onesCount;
			rollEvent.cascadeSuccesses.push(botch);
		} else {
			rollEvent.cascadeSuccesses.push(rollEvent.totalSuccessCount);
		}
	}

	if (rollEvent.defense > 0) {
		rollEvent.defenseSuccesses.push(getDefenseRoll(rollEvent.defense - rollEvent.defenseSuccesses.length));
	} else {
		rollEvent.defenseSuccesses.push(0);
	}

	//botch check
	if (rollEvent.successCount == 0 && rollEvent.successThreshold > -1) {
		handleBotch(rollEvent);
	}
	
	var faceValueSum = 0;
	rollEvent.dice.forEach(function(dice) {
		faceValueSum += dice.faceValue;
	});

	rollEvent.faceValueSum = faceValueSum;
}

function handleBotch(rollEvent) {
	
	if(rollEvent.onesCount > 5) {
		rollEvent.botchMessage = "HOLY FUCKING SHITSHOW BOTCH(" + rollEvent.onesCount + ")";
		return;
	}
	
	var messageMap = new Map();
	
	messageMap.set(1, "BOTCH");
	messageMap.set(2, "DOUBLE BOTCH");
	messageMap.set(3, "TRIPLE BOTCH");
	messageMap.set(4, "QUADRUPLE BOTCH");
	messageMap.set(5, "QUINTUPLE BOTCH");
	
	rollEvent.botchMessage = messageMap.get(rollEvent.onesCount);
}

function printCascade(rollEvent) {
	rollEvent.output = "`" + rollEvent.input + "`";

	if (rollEvent.comment) {
		rollEvent.output += " " + rollEvent.comment;
	}
	rollEvent.output += " : \n";
	for (i = 0; i < rollEvent.cascadeSuccesses.length; i++) {
		net = (rollEvent.cascadeSuccesses[i] - rollEvent.dif);
		rollEvent.output += "Attack " + (i + 1) + " " + rollEvent.cascadeDice[i] + "d" + rollEvent.diceSides + ": ";
		rollEvent.output += rollEvent.cascadeSuccesses[i] + " sux -" + rollEvent.dif + " dif = ";
		rollEvent.output += net + " to hit.";
		
		if (rollEvent.defense > i) {
			net -= Math.max(0,rollEvent.defenseSuccesses[i]);
			if (rollEvent.defenseSuccesses[i] >= 0) {
				rollEvent.output += " Defense = " + rollEvent.defenseSuccesses[i] + " sux.";
			} else {
				rollEvent.output += " Defense = BOTCH x" + (0-rollEvent.defenseSuccesses[i]) + "!";
			}
		}
		if (rollEvent.cascadeSuccesses[i] < 0) {
			rollEvent.output += " BOTCH x" + (0 - rollEvent.cascadeSuccesses[i]) + "!!!";
		} else if (net > 0) {
			rollEvent.output += " HIT with " + net;
		} else {
			rollEvent.output += " MISS!";
		}
		rollEvent.output += "\n";
	}

}

function printEvent(rollEvent) {
	rollEvent.output = "`" + rollEvent.input + "`";
	
	if(rollEvent.comment) {
		rollEvent.output += " " + rollEvent.comment;
	}
	rollEvent.output += " = ";
	
	if(rollEvent.botchMessage) {
		rollEvent.output += "**" + rollEvent.botchMessage + "!!!**";
	}
	rollEvent.output += " (";
	
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