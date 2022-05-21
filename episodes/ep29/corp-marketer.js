/** @param {NS} ns */
export async function main(ns) {
	const divisionName = ns.args[0];

	if (!divisionName) {
		throw new Error("Division name is undefined");
	}

	const corp = eval("ns.corporation");

	const getDivisionProfits = () => {
		const division = corp.getDivision(divisionName);
		const revenue = division.lastCycleRevenue;
		const expenses = division.lastCycleExpenses;
		const profit = revenue - expenses;
		ns.print(`${divisionName} profits: $`, ns.nFormat(profit, '0.000e+0'))
		return profit;
	}

	const getAdvertisingCost = () => {
		const cost = corp.getHireAdVertCost(divisionName);
		ns.print(`${divisionName} advertising cost: $`, ns.nFormat(cost, '0.000e+0'))
		return cost;
	}


	const interval = 1000;

	while(true) {
		const profit = getDivisionProfits();
		const cost = getAdvertisingCost();
		if (profit > cost) {
			ns.print("Hiring advertising")
			corp.hireAdVert(divisionName);
		}
		ns.print("");
		await ns.sleep(interval);
	}
}