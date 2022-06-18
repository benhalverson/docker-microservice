import 'jest';
import { getData, readData } from '../utils';
import { FireHolFile } from '../interfaces';

// test the getData function returns some data
describe('getData',  () => {
  it('should return an object', async() => {
    const data = await getData();
    expect(typeof data).toBe('object');
  });


});



