module Net {
	type int = number;
	type double = number;

	var NonLinearity = {
		sigmoid: (x: double) => 1 / (1 + Math.exp(-x)),
		sigDiff: (x: double) => x * (1 - x)
	}

	function makeArray<T>(len: int, supplier: () => T): T[] {
		var arr = new Array<T>(len);
		for (let i = 0; i < len; i++) arr[i] = supplier();
		return arr;
	}

	// back propagation code adapted from https://de.wikipedia.org/wiki/Backpropagation
	export class NeuralNet {
		layers: Neuron[][];
		inputs: InputNeuron[];
		outputs: OutputNeuron[];
		connections: NeuronConnection[] = [];
		learnRate: number = 0.01;
		constructor(counts: int[], inputnames:string[], weights?: double[]) {
			let nid = 0;
			this.inputs = makeArray(counts[0], () => new InputNeuron(nid,inputnames[nid++]));
			var hidden = makeArray(counts[1], () => new Neuron(nid++));
			this.outputs = makeArray(counts[2], () => new OutputNeuron(nid++));
			this.layers = [this.inputs, hidden, this.outputs];
			var onNeuron = new InputNeuron(nid++, "bias", 1);
			this.inputs.push(onNeuron);
			var startWeight = () => Math.random();
			for (let i = 0; i < this.layers.length - 1; i++) {
				let inLayer = this.layers[i];
				let outLayer = this.layers[i + 1];

				for (let input of inLayer) for (let output of outLayer) {
					var conn = new Net.NeuronConnection(input, output, startWeight());
					input.outputs.push(conn);
					output.inputs.push(conn);
					this.connections.push(conn);
				}
			}
			if (weights) weights.forEach((w, i) => this.connections[i].weight = w);
		}
		setInputs(inputVals: double[]) {
			if (inputVals.length != this.inputs.length - 1) throw "invalid input size";
			for (let i = 0; i < inputVals.length; i++)
				this.inputs[i].input = inputVals[i];
		}
		getOutput(inputVals: double[]) {
			this.setInputs(inputVals);
			return this.outputs.map(output => output.getOutput());
		}

		train(inputVals: double[], expectedOutput: double[]) {
			this.setInputs(inputVals);
			for (var i = 0; i < this.outputs.length; i++)
				this.outputs[i].targetOutput = expectedOutput[i];
			for (let conn of this.connections) {
				(<any>conn)._tmpw = conn.getDeltaWeight(this.learnRate);
			}
			for (let conn of this.connections) {
				conn.weight += (<any>conn)._tmpw;
			}
		}
	}

	export class NeuronConnection {
		constructor(public inp: Neuron, public out: Neuron, public weight: double) {

		}
		getDeltaWeight(learnRate: double) {
			return learnRate * this.out.getError() * this.inp.getOutput();
		}
	}
	export class Neuron {
		public inputs: NeuronConnection[] = [];
		public outputs: NeuronConnection[] = [];
		constructor(public id: int) { }

		weightedInputs() {
			var output = 0;
			for (let conn of this.inputs) {
				output += conn.inp.getOutput() * conn.weight;
			}
			return output;
		}
		getOutput() {
			return NonLinearity.sigmoid(this.weightedInputs());
		}

		getError() {
			var δ = 0;
			for (let output of this.outputs) {
				δ += output.out.getError() * output.weight;
			}
			return δ * NonLinearity.sigDiff(this.getOutput());
		}
	}
	export class InputNeuron extends Neuron {
		constructor(id:int, public name: string, public input: number = 0) {
			super(id);
		}
		weightedInputs() {
			return this.input;
		}
		getOutput() {
			return this.input;
		}
	}
	export class OutputNeuron extends Neuron {
		targetOutput: double;

		getOutput() {
			return Math.max(Math.min(super.weightedInputs(), 0.999), 0.001);
			//return super.weightedInputs();
		}
		getError() {
			//let oup = Math.abs(NonLinearity.sigmoid(this.getOutput()));
			/*return NonLinearity.sigDiff(NonLinearity.sigmoid(oup)) *
				(this.targetOutput - oup);*/
			let oup = this.getOutput();
			return NonLinearity.sigDiff(oup) *
				(this.targetOutput - oup);
		}
	}
}