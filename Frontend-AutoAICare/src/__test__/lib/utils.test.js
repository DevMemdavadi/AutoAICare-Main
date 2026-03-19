import { cn } from '@/lib/utils';

describe('utils', () => {
  test('cn function merges classes correctly', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  test('cn function handles conditional classes', () => {
    const result = cn('class1', false && 'class2', 'class3');
    expect(result).toBe('class1 class3');
    
    const result2 = cn('class1', true && 'class2', 'class3');
    expect(result2).toBe('class1 class2 class3');
  });

  test('cn function handles null and undefined values', () => {
    const result = cn('class1', null, 'class2', undefined, 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  test('cn function merges tailwind classes correctly', () => {
    const result = cn('p-4', 'p-4', 'text-center', 'text-left');
    expect(result).toContain('p-4');
    expect(result).toContain('text-left'); // Later value should take precedence
  });

  test('cn function handles mixed input types', () => {
    const result = cn('class1', ['class2', 'class3'], { class4: true, class5: false });
    expect(result).toContain('class1');
    expect(result).toContain('class2');
    expect(result).toContain('class3');
    expect(result).toContain('class4');
    expect(result).not.toContain('class5');
  });
});