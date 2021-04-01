const request = require('request-promise');
const discord_webhooks = require('discord-webhooks');
const log = (m) => {
	console.log('[' + new Date().toUTCString() + ']: '+m);
}
const waitFor = (t) => new Promise((resolve) => setTimeout(resolve, t));
var config = 0;


try{
	config = require('./config.json');
	if(!config || !config.discord || !config.products || config.products.length == 0){
		log('Config file: ./config.json should contains *discord* as String and *products* as Array values.');
		process.exit(-1);
	}
}catch(e){
	log('Config file: ./config.json is undefined, exit.');
	process.exit(-1);
}

log("Starting with config: \nDiscord notification webhook: "+config.discord+'\nProducts: '+config.products.join('; '));

const monitor = {
	old: [],
	products: [],
	webhook: config.discord,
	init: function(){
		let products = [];
		for(var i = 0; i<config.products.length; i++){
			try{
				let pid = config.products[i].split("://")[1].split("/")[2].split('.')[0];
				products.push({pid: pid, url: config.products[i]});
			}catch(e){}
		}
		if(products.length == 0){
			log('Check validation of product urls in config.');
			return;
		}
		this.products = products;
		this.handle();
	},
	handle: async function(){
		log('Starting fetching '+this.products.length+' product(s).');
		let requests = [];
		let notify = async function(webhook, product) {
			let message = {
				content: 'Stock Changed: '+product.url,
				username: 'Adidas Stock Monitor',
				embeds: [{
					fields: [{
						name: 'SKU',
						value: product.pid,
					},{
						name: 'Stock',
						value: product.stock.join('; '),
					}],
					color: 1752220,
					timestamp: new Date(),
					footer: {
						text: "Powered by Ghost Cook (open-source)",
					}
				}]
			}
			log(message.content);
			let discord = new discord_webhooks(webhook);
			discord.on('ready', () => {
				discord.execute(message);
			});
			discord.on('error', (e) => {
				log(e);
			});
		}
		let fetch = async function(product){
			var response = 0;
    		await request({
        		gzip: 1,
        		url: 'https://www.adidas.ru/api/products/'+product.pid+'/availability/',
        		headers: {
        		    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_0) AppleWebKit/537.73.11 (KHTML like Gecko) Version/7.0.1 Safari/537.73.11'
        		}
    		}).then((b) => {
       			response = JSON.parse(b);
    		}).catch((e) => {});
    		if(!response) return 0;
    		let stock = [];
    		for(let i = 0; i<response.variation_list.length; i++){
     		    if(response.variation_list[i].availability > 0){
     		    	stock.push(response.variation_list[i].size);
       			}
   			}
    		product.stock = stock;
    		return product;
		};
		for(let i = 0; i<this.products.length; i++){
			requests.push(Promise.resolve(fetch(this.products[i])));
		}
		let products = [];
		await Promise.all(requests).then((b) => {
			for(let i = 0; i<b.length; i++){
				if(b[i]){
					products.push(b[i]);
				}
			}
		});

		if(products.length == 0){
			log('Got 0 products, probably connection problems.');
		}else{
			log('Fetched '+products.length+' product(s).');
			if(this.old.length > 0){
				log('Comparing with old data.');
				for(let b = 0; b<products.length; b++){
					let changed = 0;
					for(let i = 0; i<this.old.length; i++){
						if(this.old[i].pid == products[b].pid){
							if(this.old[i].stock.length < products[b].stock.length){
								changed = 1;
							}
							break;
						}
					}
					if(changed || config.test){
						config.test = 0;
						notify(this.webhook, products[b]);
					}
				}
			}
			this.old = products;
		}
		let delay = (config.delay?config.delay:1500);
		log('Delay: '+delay+' ms. Waiting...');
		await waitFor(delay);
		this.handle();
	},
};

monitor.init();