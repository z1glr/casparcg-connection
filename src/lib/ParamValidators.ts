/* eslint @typescript-eslint/ban-types: 0 */
import { ParamData, Payload } from './ParamSignature'
import { AnyEnum, ChannelFormat } from './ServerStateEnum'

import * as CommandNS from './AbstractCommand'

/**
 *
 */
export interface IValidator {
	resolved: boolean
	resolve(data: Object | CommandNS.IAMCPCommand, key?: string): ParamData
}

/**
 *
 */
export abstract class AbstractValidator implements IValidator {
	public resolved = false

	abstract resolve(value: number, key?: string): ParamData
}

/**
 *
 */
export class StringValidator extends AbstractValidator {
	constructor(private lazy: boolean = true) {
		super()
	}

	resolve(data: Object | string | undefined): ParamData {
		let textstring = ''

		function checkTextstring(rawClipNameString: string | null): string {
			if (rawClipNameString === null) {
				return ''
			}

			// trim all non-textual content
			rawClipNameString = rawClipNameString.trim()

			// check length
			if (rawClipNameString.length === 0) {
				return ''
			}
			return rawClipNameString
		}

		if (Array.isArray(data)) {
			let i = 0

			// switch lazy/greedy mode
			if (this.lazy) {
				// lazy = return first valid hit
				do {
					textstring = checkTextstring(data[i])
					i++
				} while (textstring.length === 0)
			} else {
				// greedy
				textstring = ''
				data.forEach((i) => {
					const o = checkTextstring(i)
					textstring += o ? o + ' ' : ''
				})
			}
		} else if (typeof data === 'object' || typeof data === 'string') {
			textstring = data.toString()
		}

		if (!checkTextstring(textstring)) {
			return false
		}

		return textstring
	}
}

export class FilterValidator extends StringValidator {
	resolve(data: any): ParamData {
		let clipName = ''

		if (typeof data === 'object' || typeof data === 'string') {
			clipName = data !== null ? data.toString() : ''
		}

		// add quotation
		const quotedClipName = `"${clipName}"`
		return { raw: clipName, payload: quotedClipName }
	}
}

export class URLValidator extends StringValidator {
	resolve(data: Object): ParamData {
		const url: string = super.resolve(data).toString()

		// add quotation
		const quotedUrl = `"${url}"`
		return { raw: url, payload: quotedUrl }
	}
}

export class ChannelLayoutValidator extends StringValidator {
	// @todo: a combination of string and enum!
}

/**
 *
 */
export class ClipNameValidator extends AbstractValidator {
	resolve(data: any): ParamData {
		let clipName = ''

		if (typeof data === 'object' || typeof data === 'string') {
			clipName = data !== null ? data.toString() : ''
		}

		if (!this.checkClipNameString(clipName)) {
			return false
		}

		// add quotation
		const quotedClipName = `"${clipName}"`
		return { raw: clipName, payload: quotedClipName }
	}

	checkClipNameString(rawClipNameString: string | null): string {
		if (rawClipNameString === null) {
			return ''
		}

		// trim all non-textual content
		rawClipNameString = rawClipNameString.trim()

		// check length
		if (rawClipNameString.length === 0) {
			return ''
		}
		return rawClipNameString
	}
}

/**
 *
 */
export class ClipNameEmptyStringValidator extends ClipNameValidator {
	resolve(data: any): ParamData {
		let clipName = ''

		if (typeof data === 'object' || typeof data === 'string') {
			clipName = data !== null ? data.toString() : ''
		}

		if (!this.checkClipNameString(clipName) && clipName !== '') {
			return false
		}

		// add quotation
		const quotedClipName = `"${clipName}"`
		return { raw: clipName, payload: quotedClipName }
	}
}

/**
 *
 */
export class TemplateNameValidator extends ClipNameValidator {}

/**
 *
 */
export class DataNameValidator extends ClipNameValidator {}

/**
 *
 */
export class EnumValidator extends AbstractValidator {
	constructor(private _enumClass: { [key: string]: string | number }) {
		super()
	}

	resolve(data: any): ParamData {
		if (typeof data === 'string') {
			// TODO: data is known to be string here;
			let stringCast = data // !== null ? data.toString() : ''
			// format stringy enum value
			stringCast = stringCast.toUpperCase()
			stringCast = stringCast.replace(' ', '_')
			if (stringCast in this._enumClass) {
				return this._enumClass[stringCast as keyof AnyEnum]
			}
		}
		return false
	}
}

/**
 *
 */
export class ChannelFormatValidator extends AbstractValidator {
	constructor() {
		super()
	}

	resolve(data: any): ParamData {
		if (typeof data === 'string') {
			let stringCast = data.toString()
			// format stringy enum value
			stringCast = stringCast.toUpperCase()
			stringCast = stringCast.replace(' ', '_')
			if (stringCast in ChannelFormat) {
				return stringCast as ChannelFormat
			}
		}
		return false
	}
}

/**
 *
 */
export class KeywordValidator extends AbstractValidator {
	private _keyword: string
	private _caseSensitive: boolean

	constructor(keyword: string, caseSensitive = false) {
		super()
		this._keyword = keyword
		this._caseSensitive = caseSensitive
	}

	resolve(data: Array<any> | Object | string | null): ParamData {
		let keywordCopy: string = this._keyword
		if (!this._caseSensitive) {
			keywordCopy = keywordCopy.toLowerCase()
		}

		if (Array.isArray(data)) {
			if (!this._caseSensitive) {
				data = data.map((value) => String(value).toLowerCase())
			}
			if ((data as Array<string>).indexOf(keywordCopy) > -1) {
				return this._keyword
			}
		} else if (typeof data === 'object' && data !== null) {
			const objectCast = data
			if (!this._caseSensitive) {
				for (const key in objectCast) {
					;(objectCast as any)[key] = String((objectCast as any)[key]).toLowerCase()
				}
			}
			if (keywordCopy in objectCast) {
				return this._keyword
			}
		} else if (typeof data === 'string') {
			if (!this._caseSensitive) {
				data = String(data).toLowerCase()
			}
			if (data === keywordCopy) {
				return this._keyword
			}
		}

		return false
	}
}

/**
 *
 */
export class FrameValidator extends AbstractValidator {
	private _keyword: string

	constructor(keyword: string) {
		super()
		this._keyword = keyword
	}

	resolve(data: any): ParamData {
		if (Array.isArray(data)) {
			data = data.map((element) => String(element).toLowerCase())
			const index: number = (data as Array<string>).indexOf(this._keyword.toLowerCase())
			if (index > -1) {
				data = parseInt(data[index + 1], 10)
			}
		} else if (typeof data === 'object' && data !== null) {
			const objectCast = data
			if (this._keyword in objectCast) {
				data = objectCast[this._keyword] as number
			}
		} else if (typeof data === 'string') {
			data = Number(data)
		}

		if (typeof data === 'number') {
			const numberCast: number = data
			if (numberCast >= 0) {
				return numberCast
			}
		}

		return false
	}
}

/**
 *
 */
export class PositiveNumberValidatorBetween extends AbstractValidator {
	constructor(private _min: number = 0, private _max: number = Number.POSITIVE_INFINITY) {
		super()
	}

	resolve(data: number | null): ParamData {
		if (typeof data === 'number') {
			const numberCast: number = Math.max(Math.min(data, this._max), this._min)
			if (numberCast >= 0) {
				return numberCast
			}
		}

		return false
	}
}

/**
 *
 */
export class PositiveNumberValidator extends PositiveNumberValidatorBetween {
	constructor() {
		super()
	}
}

/**
 *
 */
export class PositiveNumberRoundValidatorBetween extends PositiveNumberValidatorBetween {
	resolve(data: number): ParamData {
		return Number(super.resolve(data)).toFixed()
	}
}

/**
 *
 */
export class NumberValidatorBetween extends AbstractValidator {
	constructor(private _min: number = Number.NEGATIVE_INFINITY, private _max: number = Number.POSITIVE_INFINITY) {
		super()
	}

	resolve(data: number | null): ParamData {
		if (typeof data === 'number') {
			const numberCast: number = Math.max(Math.min(data, this._max), this._min)
			return numberCast
		}

		return false
	}
}

/**
 *
 */
export class NumberValidator extends NumberValidatorBetween {
	constructor() {
		super()
	}
}

export class DecklinkDeviceValidator extends PositiveNumberValidator {}

/**
 *
 */
export class BooleanValidatorWithDefaults extends AbstractValidator {
	constructor(private _valueOnSuccess?: string | number | boolean, private _valueOnFail?: string | number | boolean) {
		super()
	}

	resolve(data: any, key: string): ParamData {
		if (Array.isArray(data)) {
			data = data.map((element) => String(element).toLowerCase())
			const index: number = (data as Array<string>).indexOf(key.toLowerCase())
			if (index > -1) {
				data = data[index + 1]
				if (data === undefined) {
					data = data[index]
				}
				// @todo: probably add some string-parsing logic:
				// if just a single boolean param in protocol, try to parse arrayCast[0] which should hold it
			} else {
				// can't resolve array
				data = false
			}
		}

		let isValid = false
		if (typeof data === 'string') {
			if (data === 'true') {
				isValid = true
			} else if (data === '1') {
				isValid = true
			} else if (data === key) {
				isValid = true
			}
		} else {
			isValid = !!data.valueOf()
		}
		if (isValid) {
			return this._valueOnSuccess !== undefined ? this._valueOnSuccess : isValid
		} else {
			return this._valueOnFail !== undefined ? this._valueOnFail : isValid
		}
	}
}

/**
 *
 */
export class BooleanValidator extends BooleanValidatorWithDefaults {
	constructor() {
		super()
	}
}

/**
 *
 */
export class TemplateDataValidator extends AbstractValidator {
	resolve(data: Object | string): ParamData {
		let stringCast = data.toString()

		// data is object: serialize
		if (typeof data === 'object') {
			stringCast = JSON.stringify(data)
		} else {
			stringCast = stringCast.replace(/\r|\n/g, (charToEscape) => {
				return charToEscape === '\r' ? '\\r' : '\\n'
			})
		}

		/*	// data is string, try to de-serialize to validate as JSON
			try {
				let objectCast = JSON.parse(stringCast);
				return stringCast;
			} catch (e) {}

			// data is string, try to de-serialize to validate as XML
			let xmlCast;
			parseString(stringCast, {async: false}, (err, res) => {
				if (res) {
					xmlCast = res;
				}
			});
			if (xmlCast) {
				return stringCast;
			}*/

		// escaping
		stringCast = stringCast.replace(/([\\"])/g, '\\$1')

		// add qoutation
		const quotedString = `"${stringCast}"`
		return { raw: stringCast, payload: quotedString }
	}
}
export class TimecodeValidator extends StringValidator {
	// nothing
}
export class RouteValidator extends AbstractValidator {
	regex = new RegExp(/(route:\/\/)\d+((-)\d+)?/g)
	regex2 = new RegExp(/\d+((-)\d+)?/g)

	resolve(data: any): ParamData {
		if (typeof data === 'string') {
			if (this.regex.test(data)) {
				return { raw: data, payload: data }
			} else if (this.regex2.test(data)) {
				return { raw: data, payload: 'route://' + data }
			} else {
				return false
			}
		} else if (typeof data === 'object') {
			// data is an object
			let routeStr = 'route://'
			if (data.channel) {
				routeStr += data.channel
				if (data.layer) {
					routeStr += '-' + data.layer
				}
				return { raw: data.toString(), payload: routeStr }
			} else {
				return false
			}
		} else {
			return false
		}
	}
}

export class RouteFramesDelayValidator extends PositiveNumberValidator {}

export class RouteModeValidator extends StringValidator {}
export class CommandValidator extends AbstractValidator {
	resolve(command: any): ParamData {
		if (CommandNS.isIAMCPCommand(command)) {
			command.validateParams()
			// TODO: The `command.constructor.commandString` is probably a bug, or at best bad pratice to name a paramter "constructur", as it is reserved.
			let commandString: string =
				(command.constructor as any).commandString + (command.address ? ' ' + command.address : '')
			for (const i in command.payload) {
				const payload: Payload = command.payload[i]
				commandString += commandString.length > 0 ? ' ' : ''
				commandString += (payload.key ? payload.key + ' ' : '') + payload.value
			}
			return commandString
		} else {
			throw new Error('Argument 0 was not an amcp command.')
		}
	}
}

export class StingTransitionPropertiesValidator extends AbstractValidator {
	regex = new RegExp(/\(((\w+=(((?:").*(?:"))+|(\d+)))( )?)*\)/g)
	props: {
		maskFile?: string
		delay?: number
		overlayFile?: string
		audioFadeStart?: number
		audioFadeDuration?: number
	} = {}

	resolve(data: any) {
		if (!data) return false

		if (typeof data === 'string' && this.regex.test(data)) {
			return { raw: data, payload: data }
		} else if (typeof data === 'object') {
			// data is an object
			this.props = data

			let str = '('

			if (this.props.maskFile) str += `MASK="${this.props.maskFile}" `
			if (this.props.overlayFile) str += `OVERLAY="${this.props.overlayFile}" `
			if (this.props.delay) str += `TRIGGER_POINT="${this.props.delay}" `
			if (this.props.audioFadeStart) str += `AUDIO_FADE_START="${this.props.audioFadeStart}" `
			if (this.props.audioFadeDuration) str += `AUDIO_FADE_DURATION="${this.props.audioFadeDuration}" `

			str = str.substr(0, str.length - 1) + ')'

			return { raw: JSON.stringify(data), payload: str }
		} else {
			return false
		}
	}
}
