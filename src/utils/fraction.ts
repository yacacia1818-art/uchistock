export interface Fraction {
  num: number;
  den: number;
}

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export function reduceFraction(f: Fraction): Fraction {
  const g = gcd(f.num, f.den);
  return { num: f.num / g, den: f.den / g };
}

// 小数を分母maxDenominatorまでの最も近い分数へスナップする（浮動小数点誤差の蓄積を防ぐ）
export function snapToFraction(decimal: number, maxDenominator = 60): Fraction {
  if (decimal <= 0) return { num: 0, den: 1 };
  let bestNum = Math.round(decimal);
  let bestDen = 1;
  let bestErr = Math.abs(decimal - bestNum);
  for (let den = 2; den <= maxDenominator; den++) {
    const num = Math.round(decimal * den);
    const err = Math.abs(decimal - num / den);
    if (err < bestErr - 1e-9) {
      bestErr = err;
      bestNum = num;
      bestDen = den;
    }
  }
  return reduceFraction({ num: bestNum, den: bestDen });
}

export function fractionToDecimal(f: Fraction): number {
  return f.num / f.den;
}

// 分数を「1と2/3」のような自然な表記へ整形する（wholeUnit=trueなら整数部に単位を付与）
export function formatFraction(decimal: number, unit: string, maxDenominator = 60): string {
  const safe = Math.max(0, decimal);
  const whole = Math.floor(safe + 1e-9);
  const remainder = safe - whole;
  if (remainder < 1e-9) {
    return `${whole}${unit}`;
  }
  const frac = snapToFraction(remainder, maxDenominator);
  if (frac.num === 0) {
    return `${whole}${unit}`;
  }
  if (frac.num >= frac.den) {
    return `${whole + 1}${unit}`;
  }
  const fracLabel = `${frac.num}/${frac.den}`;
  return whole === 0 ? `${fracLabel}${unit}` : `${whole}と${fracLabel}${unit}`;
}
