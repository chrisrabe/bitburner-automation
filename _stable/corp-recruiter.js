const MIN_EMPLOYEES = 10;

const JOB_TYPE = {
	operations: "Operations",
	engineer: "Engineer",
	business: "Business",
	management: "Management",
	development: "Research & Development"
}

/** @param {NS} ns **/
export async function main(ns) {
	const divisionName = ns.args[0];
	const cityName = ns.args[1];
	const reqEmployees = ns.args[2] || MIN_EMPLOYEES;

	const flags = ns.flags([
		['research', false]
	]);

	const corp = eval("ns.corporation");
	const office = corp.getOffice(divisionName, cityName);
	const reqSize = Math.max(office.size, reqEmployees);

	const getJobDistribution = (officeSize) => {
		if (flags.research) {
			return {
				[JOB_TYPE.operations]: 0,
				[JOB_TYPE.engineer]: 0,
				[JOB_TYPE.management]: 0,
				[JOB_TYPE.business]: 0,
				[JOB_TYPE.development]: 1,
			}
		}
		if (officeSize >= 10 && officeSize < 100) {
			return {
				[JOB_TYPE.operations]: 0.5,
				[JOB_TYPE.engineer]: 0.3,
				[JOB_TYPE.management]: 0.2
			}
		} else {
			return {
				[JOB_TYPE.operations]: 0.55,
				[JOB_TYPE.engineer]: 0.2,
				[JOB_TYPE.management]: 0.1,
				[JOB_TYPE.business]: 0.05,
				[JOB_TYPE.development]: 0.1,
			}
		}
	}

	const getEmployeeDistribution = (jobDistrib) => {
		let assigned = 0;
		const employeeDistrib = Object.keys(jobDistrib).reduce((acc, key) => {
			const amount = Math.floor(reqSize * jobDistrib[key]);
			acc[key] = amount;
			assigned += amount;
			return acc;
		}, {});

		if (assigned != reqSize) {
			const leftOver = reqSize - assigned;
			employeeDistrib[JOB_TYPE.operations] += leftOver;
		}

		return employeeDistrib;
	}

	const allocateEmployees = async () => {
		const jobDistrib = getJobDistribution(reqSize);
		const employeeDistrib = getEmployeeDistribution(jobDistrib);

		const ascEmployeeDistrib = Object.entries(employeeDistrib).sort((a, b) => a[1] - b[1]);

		for (const [job, amount] of ascEmployeeDistrib) {
			const success = await corp.setAutoJobAssignment(divisionName, cityName, job, amount);
			if (success) {
				ns.tprint(`Successfully allocated ${amount} employees to ${job}`);
			}
		}
	}

	const hireEmployees = (numToHire) => {
		let numHired = 0;
		ns.tprint(`Hiring ${numHired} employees...`);
		while (numHired < numToHire) {
			corp.hireEmployee(divisionName, cityName);
			numHired++;
		}
		ns.tprint(`Done`);
	}

	const upgradeOffice = async () => {
		const sizeToBuy = reqEmployees - office.size;
		ns.tprint(`Opening ${sizeToBuy} employee positions...`);
		const upgradeCost = corp.getOfficeSizeUpgradeCost(divisionName, cityName, sizeToBuy);
		while (corp.getCorporation().funds < upgradeCost) {
			await ns.sleep(1000); // wait until we have enough money
		}
        corp.upgradeOfficeSize(divisionName, cityName, sizeToBuy);
		hireEmployees(reqEmployees);
	}

	if (office.size != reqSize) {
		await upgradeOffice();
	}

	await allocateEmployees();
}