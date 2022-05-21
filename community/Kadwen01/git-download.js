/** @param {NS} ns **/
export async function main(ns) {

  	let list =[
        'ap-hacknet-node.js',
        'aps-lite.js',
        'auto-deploy.js',
        'auto-purchase-server.js',
        'auto-starter.js',
        'book-keeper.js',
        'captain.js',
        'diamond-hands.js',
        'find-server.js',
        'find-targets.js',
        'gimme-money.js',
        'gtfo.js',
        'launch-fleets.js',
        'pirate.js',
        'port-utils.js',
        'probe.js',
        'queue-service.js',
        'strategist.js',
        'utils.js',
        'warmonger.js',
        'watchtower.js'        
    ];

  for (const script of list) {
    ns.tprintf ('Pulling ' + script + ' off gitHub');
    await ns.wget('https://raw.githubusercontent.com/chrisrabe/bitburner-automation/main/_stable/' + script , script, "home");
  }

}