import { useEffect, useRef, useState } from 'react';

export default function SlimeMold() {
	const canvasRef = useRef(null);
	const [showStats, setShowStats] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	
	const [params, setParams] = useState({
		tickInterval: 32,
		energyDrain: 0.012,
		eatSpeed: 3,
		eatGain: 1.5,
		growthCost: 12,
		newNodeEnergy: 25,
		minEnergyToGrow: 35,
		minNodeEnergy: 8,
		survivalThreshold: 15,
		criticalThreshold: 6,
		autophagyReturn: 0.7,
		maxNodeEnergy: 120,
		growthInterval: 150,
		explorationChance: 0.02,
		foodSpawnChance: 0.4,
		foodSpawnInterval: 2000,
		foodAmount: 70,
		mutationBonus: 2.0,
		startingOrganisms: 3,
		divisionThreshold: 12,
		divisionEnergy: 400,
		wallDuration: 15000,
	});
	
	const [stats, setStats] = useState([]);

	const paramsRef = useRef(params);
	paramsRef.current = params;

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');

		let organisms = [];
		let food = [];
		let walls = [];
		let seeds = [];
		let nodeIdCounter = 0;
		let orgIdCounter = 0;
		let lastGrowth = {};
		let lastTick = 0;

		let tapCount = 0;
		let tapTimer = null;
		let pressTimer = null;
		let lastPos = null;
		
		let isDrawingWall = false;
		let currentWall = [];
		let lastTapTime = 0;

		const w = () => window.innerWidth;
		const h = () => window.innerHeight;

		const resize = () => {
			const dpr = window.devicePixelRatio || 1;
			canvas.width = w() * dpr;
			canvas.height = h() * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();
		window.addEventListener('resize', resize);

		const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
		
		const distToSegment = (p, v, w) => {
			const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
			if (l2 === 0) return dist(p, v);
			let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
			t = Math.max(0, Math.min(1, t));
			return dist(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
		};
		
		const segmentsIntersect = (p1, p2, p3, p4) => {
			const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
			return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
		};
		
		const isPathBlocked = (from, to) => {
			for (const wall of walls) {
				for (let i = 0; i < wall.points.length - 1; i++) {
					if (segmentsIntersect(from, to, wall.points[i], wall.points[i + 1])) {
						return true;
					}
				}
			}
			return false;
		};
		
		const effectiveDistance = (from, to) => {
			const d = dist(from, to);
			if (isPathBlocked(from, to)) {
				return d * 100;
			}
			return d;
		};
		
		const createOrganism = (x, y, hue, mutation = null) => {
			const id = orgIdCounter++;
			const node = {
				id: nodeIdCounter++,
				x: x || w() * 0.2 + Math.random() * w() * 0.6,
				y: y || h() * 0.2 + Math.random() * h() * 0.6,
				energy: 80,
				lastAte: Date.now(),
			};
			organisms.push({
				id,
				nodes: [node],
				edges: [],
				hue: hue ?? Math.random() * 360,
				mutation: mutation || { 
					speed: 0.8 + Math.random() * 0.4, 
					reach: 28 + Math.random() * 10, 
					branches: 1 
				},
			});
			lastGrowth[id] = 0;
			return id;
		};

		const p = paramsRef.current;
		for (let i = 0; i < p.startingOrganisms; i++) {
			const angle = (i / p.startingOrganisms) * Math.PI * 2;
			const radius = Math.min(w(), h()) * 0.25;
			const x = w() / 2 + Math.cos(angle) * radius;
			const y = h() / 2 + Math.sin(angle) * radius;
			createOrganism(x, y, (i * 360 / p.startingOrganisms + 30) % 360);
		}

		let lastFoodSpawn = Date.now();

		const addFood = (x, y) => food.push({ x, y, amount: 100 });
		const addMutation = (x, y) => food.push({ x, y, amount: 60, isMutation: true });

		const getPos = (e) => {
			const rect = canvas.getBoundingClientRect();
			const touch = e.touches?.[0];
			return { x: (touch?.clientX ?? e.clientX) - rect.left, y: (touch?.clientY ?? e.clientY) - rect.top };
		};

		const onStart = (e) => {
			if (e.target !== canvas) return;
			e.preventDefault();
			const pos = getPos(e);
			const now = Date.now();
			
			if (now - lastTapTime < 300) {
				isDrawingWall = true;
				currentWall = [pos];
				lastTapTime = 0;
				clearTimeout(tapTimer);
				clearTimeout(pressTimer);
				pressTimer = null;
				tapCount = 0;
				return;
			}
			lastTapTime = now;
			
			lastPos = pos;
			tapCount++;

			clearTimeout(tapTimer);
			tapTimer = setTimeout(() => {
				if (pressTimer === null && !isDrawingWall) {
					if (tapCount >= 3) {
						for (let i = 0; i < 5; i++) {
							const angle = (i / 5) * Math.PI * 2;
							const r = 30 + Math.random() * 20;
							addFood(lastPos.x + Math.cos(angle) * r, lastPos.y + Math.sin(angle) * r);
						}
					} else if (tapCount === 1) {
						addFood(lastPos.x, lastPos.y);
					}
				}
				tapCount = 0;
			}, 350);

			clearTimeout(pressTimer);
			pressTimer = setTimeout(() => {
				if (!isDrawingWall) {
					addMutation(pos.x, pos.y);
				}
				tapCount = 0;
				clearTimeout(tapTimer);
				pressTimer = null;
			}, 500);
		};

		const onMove = (e) => {
			if (!isDrawingWall) return;
			e.preventDefault();
			const pos = getPos(e);
			if (currentWall.length === 0 || dist(pos, currentWall[currentWall.length - 1]) > 10) {
				currentWall.push(pos);
			}
		};

		const onEnd = () => {
			if (pressTimer) {
				clearTimeout(pressTimer);
				pressTimer = null;
			}
			
			if (isDrawingWall && currentWall.length > 1) {
				walls.push({ points: currentWall, created: Date.now() });
			}
			isDrawingWall = false;
			currentWall = [];
		};

		canvas.addEventListener('touchstart', onStart, { passive: false });
		canvas.addEventListener('touchmove', onMove, { passive: false });
		canvas.addEventListener('touchend', onEnd);
		canvas.addEventListener('mousedown', onStart);
		canvas.addEventListener('mousemove', onMove);
		canvas.addEventListener('mouseup', onEnd);

		const getConnectedNodes = (startId, edges) => {
			const connected = new Set();
			const queue = [startId];
			
			while (queue.length > 0) {
				const id = queue.shift();
				if (connected.has(id)) continue;
				connected.add(id);
				
				edges.forEach(e => {
					if (e.a === id && !connected.has(e.b)) queue.push(e.b);
					if (e.b === id && !connected.has(e.a)) queue.push(e.a);
				});
			}
			
			return connected;
		};

		const buildAdjacency = (org) => {
			const adj = new Map();
			org.nodes.forEach(n => adj.set(n.id, []));
			org.edges.forEach(e => {
				if (adj.has(e.a)) adj.get(e.a).push(e.b);
				if (adj.has(e.b)) adj.get(e.b).push(e.a);
			});
			return adj;
		};

		const closestTo = (point, nodeList, useWalls = false) => {
			let closest = null;
			let minD = Infinity;
			nodeList.forEach(n => {
				const d = useWalls ? effectiveDistance(n, point) : dist(n, point);
				if (d < minD) { minD = d; closest = n; }
			});
			return { node: closest, dist: minD };
		};

		const findTarget = (org, allOrganisms, p) => {
			let bestFood = null;
			let bestScore = -Infinity;
			let bestNode = null;
			let bestDist = Infinity;
			let bestPrey = null;
			
			const myTotalEnergy = org.nodes.reduce((s, n) => s + n.energy, 0);
			const myHunger = myTotalEnergy / org.nodes.length;
			
			food.forEach(f => {
				const { node, dist: d } = closestTo(f, org.nodes, true);
				if (!node || d > 5000) return;
				
				const bonus = f.isMutation ? p.mutationBonus : 1.0;
				const score = (f.amount * bonus) / (d + 1);
				
				if (score > bestScore) {
					bestScore = score;
					bestFood = f;
					bestNode = node;
					bestDist = d;
					bestPrey = null;
				}
			});
			
			allOrganisms.forEach(prey => {
				if (prey.id === org.id) return;
				if (prey.nodes.length !== 1) return;
				
				const preyNode = prey.nodes[0];
				const preyEnergy = preyNode.energy;
				
				if (myTotalEnergy < preyEnergy * 3) return;
				
				const { node, dist: d } = closestTo(preyNode, org.nodes, true);
				if (!node || d > 5000) return;
				
				const score = (preyEnergy * 1.5) / (d + 1);
				
				if (score > bestScore) {
					bestScore = score;
					bestFood = preyNode;
					bestNode = node;
					bestDist = d;
					bestPrey = prey;
				}
			});
			
			seeds.forEach(seed => {
				const { node, dist: d } = closestTo(seed, org.nodes, true);
				if (!node || d > 5000) return;
				
				const score = (seed.energy * 2.0) / (d + 1);
				
				if (score > bestScore) {
					bestScore = score;
					bestFood = seed;
					bestNode = node;
					bestDist = d;
					bestPrey = null;
				}
			});
			
			return { food: bestFood, node: bestNode, dist: bestDist, prey: bestPrey, hunger: myHunger };
		};

		const tooCloseToOthers = (x, y, excludeOrgId, minDist = 35) => {
			for (const org of organisms) {
				if (org.id === excludeOrgId) continue;
				for (const node of org.nodes) {
					if (dist({ x, y }, node) < minDist) return true;
				}
			}
			return false;
		};
		
		const collidesWithWall = (x, y, wallDist = 15) => {
			for (const wall of walls) {
				for (let i = 0; i < wall.points.length - 1; i++) {
					if (distToSegment({ x, y }, wall.points[i], wall.points[i + 1]) < wallDist) {
						return true;
					}
				}
			}
			return false;
		};

		let frame;
		
		const tick = (timestamp) => {
			const p = paramsRef.current;
			
			if (timestamp - lastTick < p.tickInterval) {
				frame = requestAnimationFrame(tick);
				return;
			}
			lastTick = timestamp;
			
			const now = Date.now();

			ctx.fillStyle = '#0a0a0f';
			ctx.fillRect(0, 0, w(), h());

			walls = walls.filter(wall => now - wall.created < p.wallDuration);

			if (now - lastFoodSpawn > p.foodSpawnInterval) {
				if (Math.random() < p.foodSpawnChance) {
					const fx = Math.random() * w();
					const fy = Math.random() * h();
					if (!collidesWithWall(fx, fy)) {
						food.push({ x: fx, y: fy, amount: p.foodAmount });
					}
				}
				lastFoodSpawn = now;
			}

			food = food.filter(f => f.amount > 0);
			seeds = seeds.filter(s => now - s.created < 30000);

			organisms.forEach(org => {
				const adj = buildAdjacency(org);
				const totalEnergy = org.nodes.reduce((s, n) => s + n.energy, 0);
				
				org.nodes.forEach(node => {
					node.energy -= p.energyDrain;

					food.forEach(f => {
						if (dist(node, f) < 25) {
							const eat = Math.min(f.amount, p.eatSpeed);
							f.amount -= eat;
							node.energy += eat * p.eatGain;
							node.lastAte = now;
							
							if (f.isMutation && f.amount <= 0) {
								const t = Math.floor(Math.random() * 4);
								if (t === 0) org.hue = (org.hue + 40 + Math.random() * 40) % 360;
								if (t === 1) org.mutation.speed = 0.6 + Math.random() * 1.4;
								if (t === 2) org.mutation.reach = 25 + Math.random() * 35;
								if (t === 3) org.mutation.branches = 1 + Math.floor(Math.random() * 3);
							}
						}
					});
					
					seeds.forEach((seed, idx) => {
						if (dist(node, seed) < 25) {
							node.energy += seed.energy;
							org.hue = seed.mutation.hue;
							org.mutation = { ...seed.mutation };
							delete org.mutation.hue;
							seeds.splice(idx, 1);
						}
					});
					
					const myTotalEnergy = org.nodes.reduce((s, n) => s + n.energy, 0);
					organisms.forEach(prey => {
						if (prey.id === org.id) return;
						if (prey.nodes.length !== 1) return;
						if (prey.nodes[0].energy <= 0) return;
						
						const preyEnergy = prey.nodes[0].energy;
						if (myTotalEnergy < preyEnergy * 3) return;
						
						if (dist(node, prey.nodes[0]) < 25) {
							node.energy += preyEnergy * 0.9;
							node.energy = Math.min(p.maxNodeEnergy, node.energy);
							node.lastAte = now;
							prey.nodes[0].energy = 0;
						}
					});

					walls.forEach(wall => {
						for (let i = 0; i < wall.points.length - 1; i++) {
							const d = distToSegment(node, wall.points[i], wall.points[i + 1]);
							if (d < 20 && d > 0) {
								const v = wall.points[i];
								const w = wall.points[i + 1];
								const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
								let t = l2 === 0 ? 0 : ((node.x - v.x) * (w.x - v.x) + (node.y - v.y) * (w.y - v.y)) / l2;
								t = Math.max(0, Math.min(1, t));
								const closest = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
								
								const push = (20 - d) * 0.1;
								const dx = node.x - closest.x;
								const dy = node.y - closest.y;
								const len = Math.hypot(dx, dy) || 1;
								node.x += (dx / len) * push;
								node.y += (dy / len) * push;
							}
						}
					});

					org.nodes.forEach(other => {
						if (other.id === node.id) return;
						const d = dist(node, other);
						if (d < 35 && d > 0) {
							const push = (35 - d) * 0.015;
							node.x += ((node.x - other.x) / d) * push;
							node.y += ((node.y - other.y) / d) * push;
						}
					});

					organisms.forEach(otherOrg => {
						if (otherOrg.id === org.id) return;
						otherOrg.nodes.forEach(other => {
							const d = dist(node, other);
							if (d < 50 && d > 0) {
								const push = (50 - d) * 0.03;
								node.x += ((node.x - other.x) / d) * push;
								node.y += ((node.y - other.y) / d) * push;
							}
						});
					});

					node.energy = Math.min(p.maxNodeEnergy, node.energy);
					node.x = Math.max(10, Math.min(w() - 10, node.x));
					node.y = Math.max(10, Math.min(h() - 10, node.y));
				});

				const toConsume = [];
				
				org.nodes.forEach(node => {
					const connections = adj.get(node.id) || [];
					const isTerminal = connections.length === 1;
					
					if (isTerminal && node.energy < p.criticalThreshold) {
						toConsume.push({
							node,
							neighborId: connections[0],
						});
					}
				});

				if (org.nodes.length > 1) {
					toConsume.sort((a, b) => a.node.lastAte - b.node.lastAte);
					
					for (const { node, neighborId } of toConsume) {
						if (org.nodes.length <= 1) break;
						
						const neighbor = org.nodes.find(n => n.id === neighborId);
						if (neighbor) {
							neighbor.energy += node.energy * p.autophagyReturn;
							neighbor.energy = Math.min(p.maxNodeEnergy, neighbor.energy);
						}
						
						node.energy = 0;
					}
				}

				org.nodes = org.nodes.filter(n => n.energy > 0);
				
				const aliveIds = new Set(org.nodes.map(n => n.id));
				org.edges = org.edges.filter(e => aliveIds.has(e.a) && aliveIds.has(e.b));

				if (org.nodes.length > 0) {
					const mainConnected = getConnectedNodes(org.nodes[0].id, org.edges);
					
					org.nodes.forEach(node => {
						if (!mainConnected.has(node.id)) {
							food.push({ x: node.x, y: node.y, amount: node.energy * 0.4 });
							node.energy = 0;
						}
					});
					
					org.nodes = org.nodes.filter(n => n.energy > 0);
					org.edges = org.edges.filter(e => {
						const ids = new Set(org.nodes.map(n => n.id));
						return ids.has(e.a) && ids.has(e.b);
					});
				}

				const target = findTarget(org, organisms, p);
				org.target = target;

				if (org.nodes.length > 1) {
					const dying = org.nodes.filter(n => 
						n.energy >= p.criticalThreshold && 
						n.energy < p.survivalThreshold
					);
					const excess = org.nodes.filter(n => n.energy > p.minNodeEnergy + 10);
					
					dying.sort((a, b) => b.lastAte - a.lastAte);
					
					dying.forEach(dyingNode => {
						const needed = p.survivalThreshold - dyingNode.energy + 5;
						let collected = 0;
						
						excess.forEach(donor => {
							if (collected >= needed) return;
							const available = donor.energy - p.minNodeEnergy;
							const give = Math.min(available * 0.5, needed - collected);
							if (give > 0) {
								donor.energy -= give;
								collected += give;
							}
						});
						
						dyingNode.energy += collected;
					});
					
					if (target.node && target.node.energy < p.minEnergyToGrow) {
						let totalExcess = 0;
						org.nodes.forEach(node => {
							if (node.id === target.node.id) return;
							const available = node.energy - p.minNodeEnergy;
							if (available > 5) {
								const give = available * 0.3;
								node.energy -= give;
								totalExcess += give;
							}
						});
						target.node.energy += totalExcess;
					}
				}

				const currentTotalEnergy = org.nodes.reduce((s, n) => s + n.energy, 0);
				if (org.nodes.length >= p.divisionThreshold && currentTotalEnergy >= p.divisionEnergy) {
					const centerX = org.nodes.reduce((s, n) => s + n.x, 0) / org.nodes.length;
					const centerY = org.nodes.reduce((s, n) => s + n.y, 0) / org.nodes.length;
					
					let furthest = org.nodes[0];
					let maxD = 0;
					org.nodes.forEach(n => {
						const d = dist(n, { x: centerX, y: centerY });
						if (d > maxD) { maxD = d; furthest = n; }
					});
					
					const newId = orgIdCounter++;
					const childMutation = {
						speed: org.mutation.speed * (0.9 + Math.random() * 0.2),
						reach: org.mutation.reach * (0.9 + Math.random() * 0.2),
						branches: org.mutation.branches,
					};
					
					const childNode = {
						id: nodeIdCounter++,
						x: furthest.x + (Math.random() - 0.5) * 20,
						y: furthest.y + (Math.random() - 0.5) * 20,
						energy: currentTotalEnergy * 0.3,
						lastAte: now,
					};
					
					organisms.push({
						id: newId,
						nodes: [childNode],
						edges: [],
						hue: (org.hue + 20 + Math.random() * 20) % 360,
						mutation: childMutation,
					});
					lastGrowth[newId] = 0;
					
					const energyToRemove = currentTotalEnergy * 0.35;
					let removed = 0;
					org.nodes.forEach(n => {
						const take = Math.min(n.energy * 0.35, energyToRemove - removed);
						n.energy -= take;
						removed += take;
					});
				}

				const canGrow = now - (lastGrowth[org.id] || 0) > p.growthInterval / org.mutation.speed;
				
				if (canGrow && org.nodes.length > 0 && target.food && target.node) {
					const source = target.node;
					
					if (source.energy > p.minEnergyToGrow) {
						const dx = target.food.x - source.x;
						const dy = target.food.y - source.y;
						const angle = Math.atan2(dy, dx);
						const testX = source.x + Math.cos(angle) * org.mutation.reach;
						const testY = source.y + Math.sin(angle) * org.mutation.reach;
						
						const pathClear = !tooCloseToOthers(testX, testY, org.id) && 
						                  !collidesWithWall(testX, testY) && 
						                  !isPathBlocked(source, {x: testX, y: testY});
						
						if (pathClear) {
							lastGrowth[org.id] = now;
							
							const costPerBranch = p.growthCost / Math.sqrt(org.mutation.branches);
							const energyPerBranch = p.newNodeEnergy / Math.sqrt(org.mutation.branches);
							
							for (let b = 0; b < org.mutation.branches && source.energy > costPerBranch + 5; b++) {
								const spread = (b - (org.mutation.branches - 1) / 2) * 0.5;
								const a = angle + spread + (Math.random() - 0.5) * 0.15;
								const r = org.mutation.reach + Math.random() * 8;

								const newNode = {
									id: nodeIdCounter++,
									x: source.x + Math.cos(a) * r,
									y: source.y + Math.sin(a) * r,
									energy: energyPerBranch,
									lastAte: now - 5000,
								};
								source.energy -= costPerBranch;
								org.nodes.push(newNode);
								org.edges.push({ a: source.id, b: newNode.id });
							}
						}
					}
				}

				if (food.length === 0 && org.nodes.length > 0 && Math.random() < p.explorationChance * org.mutation.speed) {
					const candidates = org.nodes.filter(n => n.energy > p.minEnergyToGrow);
					if (candidates.length > 0) {
						const source = candidates[Math.floor(Math.random() * candidates.length)];
						const a = Math.random() * Math.PI * 2;
						const testX = source.x + Math.cos(a) * org.mutation.reach;
						const testY = source.y + Math.sin(a) * org.mutation.reach;
						
						const pathClear = !tooCloseToOthers(testX, testY, org.id) && 
						                  !collidesWithWall(testX, testY) &&
						                  !isPathBlocked(source, {x: testX, y: testY});
						
						if (pathClear) {
							const newNode = {
								id: nodeIdCounter++,
								x: testX,
								y: testY,
								energy: p.newNodeEnergy * 0.7,
								lastAte: now - 5000,
							};
							source.energy -= p.growthCost;
							org.nodes.push(newNode);
							org.edges.push({ a: source.id, b: newNode.id });
						}
					}
				}
			});

			organisms.forEach(org => {
				if (org.nodes.length === 0) {
					const centerX = org.lastCenter?.x || w() / 2;
					const centerY = org.lastCenter?.y || h() / 2;
					seeds.push({
						x: centerX,
						y: centerY,
						energy: 30,
						mutation: { ...org.mutation, hue: org.hue },
						created: now,
					});
				} else {
					org.lastCenter = {
						x: org.nodes.reduce((s, n) => s + n.x, 0) / org.nodes.length,
						y: org.nodes.reduce((s, n) => s + n.y, 0) / org.nodes.length,
					};
				}
			});

			organisms = organisms.filter(org => org.nodes.length > 0);
			
			const foodClaims = new Map();
			
			organisms.forEach(org => {
				if (org.target?.food && !org.target.prey) {
					const foodKey = `${org.target.food.x},${org.target.food.y}`;
					if (!foodClaims.has(foodKey)) {
						foodClaims.set(foodKey, []);
					}
					foodClaims.get(foodKey).push({ org, hunger: org.target.hunger });
				}
			});
			
			foodClaims.forEach((claims, foodKey) => {
				if (claims.length <= 1) return;
				
				claims.sort((a, b) => a.hunger - b.hunger);
				
				for (let i = 1; i < claims.length; i++) {
					claims[i].org.target = { food: null, node: null, dist: Infinity, prey: null };
				}
			});
			
			while (organisms.length < p.startingOrganisms) {
				const angle = Math.random() * Math.PI * 2;
				const radius = Math.min(w(), h()) * 0.3;
				const x = w() / 2 + Math.cos(angle) * radius;
				const y = h() / 2 + Math.sin(angle) * radius;
				createOrganism(x, y);
			}

			walls.forEach(wall => {
				if (wall.points.length < 2) return;
				const age = (now - wall.created) / p.wallDuration;
				const alpha = 1 - age * 0.7;
				
				ctx.beginPath();
				ctx.moveTo(wall.points[0].x, wall.points[0].y);
				for (let i = 1; i < wall.points.length; i++) {
					ctx.lineTo(wall.points[i].x, wall.points[i].y);
				}
				ctx.strokeStyle = `rgba(100, 150, 255, ${alpha})`;
				ctx.lineWidth = 4;
				ctx.lineCap = 'round';
				ctx.lineJoin = 'round';
				ctx.stroke();
			});
			
			if (isDrawingWall && currentWall.length > 1) {
				ctx.beginPath();
				ctx.moveTo(currentWall[0].x, currentWall[0].y);
				for (let i = 1; i < currentWall.length; i++) {
					ctx.lineTo(currentWall[i].x, currentWall[i].y);
				}
				ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
				ctx.lineWidth = 4;
				ctx.lineCap = 'round';
				ctx.stroke();
			}
			
			seeds.forEach(seed => {
				const age = (now - seed.created) / 30000;
				const pulse = 1 + Math.sin(now / 200) * 0.3;
				const alpha = 1 - age * 0.5;
				
				ctx.beginPath();
				ctx.arc(seed.x, seed.y, 8 * pulse, 0, Math.PI * 2);
				ctx.fillStyle = `hsla(${seed.mutation.hue}, 80%, 60%, ${alpha})`;
				ctx.fill();
				
				ctx.beginPath();
				ctx.arc(seed.x, seed.y, 12 * pulse, 0, Math.PI * 2);
				ctx.strokeStyle = `hsla(${seed.mutation.hue}, 80%, 70%, ${alpha * 0.5})`;
				ctx.lineWidth = 2;
				ctx.stroke();
			});
			
			food.forEach(f => {
				const isTarget = organisms.some(org => org.target?.food === f && !org.target?.prey);
				
				ctx.beginPath();
				ctx.arc(f.x, f.y, 5 + f.amount / 30, 0, Math.PI * 2);
				
				if (f.isMutation) {
					ctx.fillStyle = `hsla(280, 80%, 60%, ${Math.min(1, f.amount / 50)})`;
				} else {
					ctx.fillStyle = `hsla(120, 70%, 50%, ${Math.min(1, f.amount / 50)})`;
				}
				ctx.fill();
				
				if (isTarget) {
					ctx.beginPath();
					ctx.arc(f.x, f.y, 12 + f.amount / 25, 0, Math.PI * 2);
					ctx.strokeStyle = f.isMutation 
						? `hsla(280, 80%, 60%, ${0.3 + Math.sin(now / 200) * 0.2})`
						: `hsla(120, 80%, 50%, ${0.3 + Math.sin(now / 200) * 0.2})`;
					ctx.lineWidth = 2;
					ctx.stroke();
				}
			});

			organisms.forEach(org => {
				const hue = org.hue;
				const adj = buildAdjacency(org);
				
				const isBeingHunted = organisms.some(predator => 
					predator.target?.prey?.id === org.id
				);
				
				if (isBeingHunted && org.nodes.length === 1) {
					const n = org.nodes[0];
					ctx.beginPath();
					ctx.arc(n.x, n.y, 20 + Math.sin(now / 100) * 5, 0, Math.PI * 2);
					ctx.strokeStyle = `rgba(255, 100, 100, ${0.5 + Math.sin(now / 150) * 0.3})`;
					ctx.lineWidth = 2;
					ctx.stroke();
				}
				
				org.edges.forEach(e => {
					const na = org.nodes.find(n => n.id === e.a);
					const nb = org.nodes.find(n => n.id === e.b);
					if (na && nb) {
						ctx.beginPath();
						ctx.moveTo(na.x, na.y);
						ctx.lineTo(nb.x, nb.y);
						ctx.strokeStyle = `hsla(${hue}, 60%, 45%, 0.6)`;
						ctx.lineWidth = 2;
						ctx.stroke();
					}
				});

				org.nodes.forEach(node => {
					const size = 3 + node.energy / 50;
					const pulse = 1 + Math.sin(now / 400 + node.id) * 0.12;
					const isFront = org.target?.node?.id === node.id;
					const isDying = node.energy < p.survivalThreshold;
					const isCritical = node.energy < p.criticalThreshold;
					const connections = adj.get(node.id) || [];
					const isTerminal = connections.length === 1;

					const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 2.5 * pulse);
					grad.addColorStop(0, `hsla(${hue}, 70%, 55%, 0.9)`);
					grad.addColorStop(0.5, `hsla(${hue}, 70%, 55%, 0.3)`);
					grad.addColorStop(1, `hsla(${hue}, 70%, 55%, 0)`);
					ctx.beginPath();
					ctx.arc(node.x, node.y, size * 2.5 * pulse, 0, Math.PI * 2);
					ctx.fillStyle = grad;
					ctx.fill();

					ctx.beginPath();
					ctx.arc(node.x, node.y, size * pulse, 0, Math.PI * 2);
					
					if (isCritical && isTerminal) {
						const flash = Math.sin(now / 100) > 0 ? 70 : 40;
						ctx.fillStyle = `hsl(0, 80%, ${flash}%)`;
					} else if (isDying) {
						ctx.fillStyle = `hsl(30, 70%, 50%)`;
					} else {
						ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
					}
					ctx.fill();
					
					if (isFront) {
						ctx.beginPath();
						ctx.arc(node.x, node.y, size * 1.8 * pulse, 0, Math.PI * 2);
						ctx.strokeStyle = `hsla(${(hue + 60) % 360}, 90%, 70%, ${0.5 + Math.sin(now / 150) * 0.3})`;
						ctx.lineWidth = 2;
						ctx.stroke();
					}
				});
			});

			setStats(organisms.map(org => ({
				nodes: org.nodes.length,
				energy: Math.round(org.nodes.reduce((s, n) => s + n.energy, 0)),
				hue: Math.round(org.hue),
				frontEnergy: org.target?.node ? Math.round(org.target.node.energy) : 0,
			})));

			frame = requestAnimationFrame(tick);
		};

		frame = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', resize);
			canvas.removeEventListener('touchstart', onStart);
			canvas.removeEventListener('touchmove', onMove);
			canvas.removeEventListener('touchend', onEnd);
			canvas.removeEventListener('mousedown', onStart);
			canvas.removeEventListener('mousemove', onMove);
			canvas.removeEventListener('mouseup', onEnd);
		};
	}, []);

	const resetParams = () => setParams({
		tickInterval: 32,
		energyDrain: 0.012,
		eatSpeed: 3,
		eatGain: 1.5,
		growthCost: 12,
		newNodeEnergy: 25,
		minEnergyToGrow: 35,
		minNodeEnergy: 8,
		survivalThreshold: 15,
		criticalThreshold: 6,
		autophagyReturn: 0.7,
		maxNodeEnergy: 120,
		growthInterval: 150,
		explorationChance: 0.02,
		foodSpawnChance: 0.4,
		foodSpawnInterval: 2000,
		foodAmount: 70,
		mutationBonus: 2.0,
		startingOrganisms: 3,
		divisionThreshold: 12,
		divisionEnergy: 400,
		wallDuration: 15000,
	});

	return (
		<div className="relative w-full h-screen bg-[#0a0a0f] overflow-hidden touch-none">
			<canvas ref={canvasRef} className="w-full h-full block" />

			<div className="absolute bottom-4 left-4 text-white/40 text-xs pointer-events-none space-y-1">
				<div>tap = food</div>
				<div>hold = mutate</div>
				<div>triple = food burst</div>
				<div>double + drag = wall</div>
			</div>

			<button
				onClick={() => { setShowSettings(!showSettings); setShowStats(false); }}
				className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 text-white/60 text-sm flex items-center justify-center hover:bg-white/20"
			>
				⚙
			</button>

			<button
				onClick={() => { setShowStats(!showStats); setShowSettings(false); }}
				className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-white/60 text-sm font-bold flex items-center justify-center hover:bg-white/20"
			>
				i
			</button>

			{showSettings && (
				<div className="absolute top-14 left-4 w-72 max-h-[80vh] overflow-y-auto bg-gray-900/95 rounded-xl p-4 text-white text-sm shadow-xl">
					<div className="flex justify-between items-center mb-3">
						<span className="font-bold">Parameters</span>
						<button onClick={resetParams} className="text-xs text-white/40 hover:text-white/70">Reset</button>
					</div>
					
					<div className="space-y-3">
						<div>
							<div className="flex justify-between mb-1">
								<span className="text-white/70">Organisms</span>
								<span className="font-mono text-white/50">{params.startingOrganisms}</span>
							</div>
							<input type="range" min="1" max="8" step="1"
								value={params.startingOrganisms}
								onChange={e => setParams({...params, startingOrganisms: parseInt(e.target.value)})}
								className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
							/>
						</div>

						<div>
							<div className="flex justify-between mb-1">
								<span className="text-white/70">Tick Interval</span>
								<span className="font-mono text-white/50">{params.tickInterval}ms</span>
							</div>
							<input type="range" min="16" max="100" step="4"
								value={params.tickInterval}
								onChange={e => setParams({...params, tickInterval: parseInt(e.target.value)})}
								className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
							/>
						</div>

						<div>
							<div className="flex justify-between mb-1">
								<span className="text-white/70">Energy Drain</span>
								<span className="font-mono text-white/50">{params.energyDrain.toFixed(3)}</span>
							</div>
							<input type="range" min="0.005" max="0.03" step="0.001" 
								value={params.energyDrain}
								onChange={e => setParams({...params, energyDrain: parseFloat(e.target.value)})}
								className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
							/>
						</div>

						<div>
							<div className="flex justify-between mb-1">
								<span className="text-white/70">Growth Interval</span>
								<span className="font-mono text-white/50">{params.growthInterval}ms</span>
							</div>
							<input type="range" min="50" max="400" step="25"
								value={params.growthInterval}
								onChange={e => setParams({...params, growthInterval: parseInt(e.target.value)})}
								className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
							/>
						</div>

						<div className="border-t border-white/10 pt-3 mt-3">
							<div className="text-xs text-white/50 uppercase tracking-wide mb-2">Division</div>
						</div>

						<div>
							<div className="flex justify-between mb-1">
								<span className="text-white/70">Min Nodes</span>
								<span className="font-mono text-white/50">{params.divisionThreshold}</span>
							</div>
							<input type="range" min="6" max="25" step="1"
								value={params.divisionThreshold}
								onChange={e => setParams({...params, divisionThreshold: parseInt(e.target.value)})}
								className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
							/>
						</div>

						<div>
							<div className="flex justify-between mb-1">
								<span className="text-white/70">Min Energy</span>
								<span className="font-mono text-white/50">{params.divisionEnergy}</span>
							</div>
							<input type="range" min="200" max="800" step="50"
								value={params.divisionEnergy}
								onChange={e => setParams({...params, divisionEnergy: parseInt(e.target.value)})}
								className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
							/>
						</div>

						<div className="border-t border-white/10 pt-3 mt-3">
							<div className="text-xs text-white/50 uppercase tracking-wide mb-2">Walls</div>
						</div>

						<div>
							<div className="flex justify-between mb-1">
								<span className="text-white/70">Duration</span>
								<span className="font-mono text-white/50">{(params.wallDuration/1000).toFixed(0)}s</span>
							</div>
							<input type="range" min="5000" max="60000" step="5000"
								value={params.wallDuration}
								onChange={e => setParams({...params, wallDuration: parseInt(e.target.value)})}
								className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
							/>
						</div>

						<div className="border-t border-white/10 pt-3 mt-3">
							<div className="text-xs text-white/50 uppercase tracking-wide mb-2">Food</div>
						</div>

						<div>
							<div className="flex justify-between mb-1">
								<span className="text-white/70">Spawn Chance</span>
								<span className="font-mono text-white/50">{(params.foodSpawnChance * 100).toFixed(0)}%</span>
							</div>
							<input type="range" min="0.1" max="1" step="0.1"
								value={params.foodSpawnChance}
								onChange={e => setParams({...params, foodSpawnChance: parseFloat(e.target.value)})}
								className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
							/>
						</div>

						<div>
							<div className="flex justify-between mb-1">
								<span className="text-white/70">Spawn Interval</span>
								<span className="font-mono text-white/50">{(params.foodSpawnInterval/1000).toFixed(1)}s</span>
							</div>
							<input type="range" min="500" max="6000" step="250"
								value={params.foodSpawnInterval}
								onChange={e => setParams({...params, foodSpawnInterval: parseInt(e.target.value)})}
								className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
							/>
						</div>

						<div>
							<div className="flex justify-between mb-1">
								<span className="text-white/70">Food Amount</span>
								<span className="font-mono text-white/50">{params.foodAmount}</span>
							</div>
							<input type="range" min="30" max="150" step="10"
								value={params.foodAmount}
								onChange={e => setParams({...params, foodAmount: parseInt(e.target.value)})}
								className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
							/>
						</div>
					</div>
				</div>
			)}

			{showStats && (
				<div className="absolute top-14 right-4 w-64 bg-gray-900/95 rounded-xl p-4 text-white text-sm shadow-xl max-h-[80vh] overflow-y-auto">
					<div className="font-bold mb-3">Organisms ({stats.length})</div>
					
					<div className="space-y-3">
						{stats.map((org, i) => (
							<div key={i} className="bg-white/5 rounded-lg p-3">
								<div className="flex items-center gap-2 mb-2">
									<div 
										className="w-4 h-4 rounded-full" 
										style={{ backgroundColor: `hsl(${org.hue}, 70%, 55%)` }}
									/>
									<span className="font-medium">Organism {i + 1}</span>
								</div>
								<div className="grid grid-cols-3 gap-2 text-xs">
									<div>
										<div className="text-white/50">Nodes</div>
										<div className="font-bold">{org.nodes}</div>
									</div>
									<div>
										<div className="text-white/50">Energy</div>
										<div className="font-bold">{org.energy}</div>
									</div>
									<div>
										<div className="text-white/50">Front</div>
										<div className="font-bold text-yellow-400">{org.frontEnergy}</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
