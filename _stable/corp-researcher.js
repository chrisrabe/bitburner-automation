/** 
 * Researches all the essential researches for a division
 * @param {NS} ns 
 */
 export async function main(ns) {
	ns.disableLog('ALL');
	const divisionName = ns.args[0];

	if (!divisionName) {
		throw new Error("Division name not defined.");
	}

	const corp = eval("ns.corporation");
	//const corp = ns.corporation;
	const division = corp.getDivision(divisionName);

	var researchNames;
	var researchOrder;

	if (division.makesProducts) {
		researchNames = {
			lab: 'Hi-Tech R&D Laboratory',
			marketTA1: 'Market-TA.I',
			marketTA2: 'Market-TA.II',
			fulcrum: 'uPgrade: Fulcrum',
			capacity1: 'uPgrade: Capacity.I',
			capacity2: 'uPgrade: Capacity.II'
		};

		researchOrder = [
			researchNames.lab,
			researchNames.marketTA1,
			researchNames.marketTA2,
			researchNames.fulcrum,
			researchNames.capacity1,
			researchNames.capacity2
		];
	}
	else {
		researchNames = {
			lab: 'Hi-Tech R&D Laboratory',
			marketTA1: 'Market-TA.I',
			marketTA2: 'Market-TA.II'
		};

		researchOrder = [
			researchNames.lab,
			researchNames.marketTA1,
			researchNames.marketTA2
		];
	}

	const getResearchPoints = () => {
		division.research;
	}

	const getResearchLeft = () => 
		researchOrder.filter(researchName => !corp.hasResearched(divisionName, researchName))
	
	const interval = 1000;

	while(true) {
		const researchLeft = getResearchLeft();
		if (researchLeft.length < 1) {
			ns.tprint(`All essential research complete for division: ${divisionName}`);
			return;
		}

		const curPoints = getResearchPoints();
		const pendingResearch = researchLeft[0];
		const researchCost = corp.getResearchCost(divisionName, pendingResearch);

		if (curPoints >= researchCost) {
			ns.print(`SUCCESS Researching ${pendingResearch} @ ${divisionName}`);
			corp.research(divisionName, pendingResearch);
		} else {
			ns.print(`WARNING Pending ${pendingResearch} @ ${divisionName}`);
		}

		await ns.sleep(interval);
	}
}
