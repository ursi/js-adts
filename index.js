"use strict";

const typeKey = `__type`;
const constructorKey = `__constructor`;

const typeOf = v => {
	const t = typeof v;

	return t === `object`
		? v[typeKey] ? v[typeKey] : `object`
		: t;
};

const toTypeString = type => {
	return typeof type === `string`
		? type
		: type.type;
};

const typeCheckArray = (types, as) => {
	return as.every((v, i) => {
		if (typeOf(v) === types[i])
			return true;
		else
			throw Error(`Expecting type "${types[i]}" at argument ${i + 1}, received an argument of type "${typeOf(v)}".`);
	});
};

const enforceArgs = (types, f) => {
	const n = types.length;

	return (...args) => {
		if (args.length !== n) {
			throw Error(`"${f.name}" only accepts ${n} argument${n === 1 ? `` : `s`}, you tried to pass in ${args.length}.`);
		} else {
			typeCheckArray(types, args);
			return f(...args);
		}
	};
};

const ADT = (name, constructors) => {
	if (typeof name !== `string`)
		throw Error(`You forgot to give your type a name.`);

	const typeObject = {};
	const typeName = `(${name})`;

	for (const [k, v] of Object.entries(constructors)) {
		if (k === `type` || k === `case`)
			throw Error(`"${k}" can not be used for a type constructor, it is reserved.`);

		const constructor = enforceArgs(v.map(toTypeString), (...args) => {
			args[constructorKey] = k;
			args[typeKey] = typeName;
			return args;
		});

		typeObject[k] = v.length === 0
			? constructor()
			: constructor;
	}

	typeObject.type = typeName;

	typeObject.case = cases => {
		const allCases = Object.getOwnPropertyNames(typeObject).every(k => {
			return typeObject[k].hasOwnProperty(constructorKey)
				? cases.hasOwnProperty(k)
				: true;
		});

		if (!allCases && !cases.hasOwnProperty(`_`))
			throw Error(`You have not covered every possible case. Use a "_" property to cover all unlisted cases.`);

		return value => {
			const maybeCase = cases[value[constructorKey]];

			if (maybeCase)
				return maybeCase(...value);
			else
				return cases._();
		};
	};

	return new Proxy(typeObject, {
		get(targ, p) {
			if (targ.hasOwnProperty(p))
				return targ[p];
			else
				throw Error(`${typeName} has no "${p}" property.`);
		},

		set() {
			throw Error(`You cannot modify the ${typeName} type object directly, modify the available properties where you create it.`);
		},
	});
};

const eq = function f(a, b) {
	if (typeOf(a) === typeOf(b)) {
		if (Array.isArray(a)) {
			if (a[constructorKey] === b[constructorKey])
				return a.every((v, i) => f(v, b[i]));
			else
				return false;
		} else {
			return a === b;
		}
	} else {
		throw Error(`You're trying to compare a value of type ${typeOf(a)} with a value of type ${typeOf(b)}. You can use "typeOf" to check if two values are of the same type.`);
	}
};

const show = function f(a) {
	if (typeof a === `object`) {
		if (a === null) {
			return a;
		} else if (a.hasOwnProperty(constructorKey)) {
			return a.length === 0
				? a[constructorKey]
				: `(${a[constructorKey]} ${a.map(f).join(` `)})`;
		} else if (Array.isArray(a)) {
			return `[ ${a.map(f).join(`, `)} ]`;
		} else {
			return a.toString();
		}
	} else {
		return a;
	}
};

const Maybe = type => {
	return ADT(`Maybe ${toTypeString(type)}`, {
		Just: [ type ],
		Nothing: []
	});
};

const just = value => {
	return Maybe(typeOf(value)).Just(value);
};

const Tuple = (type1, type2) => {
	return ADT(`Tuple ${toTypeString(type1)} ${toTypeString(type2)}`, {
		Tuple: [ type1, type2 ]
	});
};

const tuple = (a, b) => {
	return Tuple(typeOf(a), typeOf(b)).Tuple(a, b);
};

const Either = (type1, type2) => {
	return ADT(`Either ${toTypeString(type1)} ${toTypeString(type2)}`, {
		Left: [ type1 ],
		Right: [ type2 ]
	});
};

export default ADT

export {
	eq,
	show,
	typeOf,
	toTypeString,
	Maybe,
	just,
	Tuple,
	tuple,
	Either,
}
