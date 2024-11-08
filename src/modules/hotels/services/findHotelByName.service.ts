import { Inject, Injectable } from '@nestjs/common';
import { IHotelRepositories } from '../domain/repositories/IHotel.repositories';
import { HOTEL_SERVICE_TOKEN } from '../uitls/hotelServiceToken';

@Injectable()
export class FindHotelByNameService {
  constructor(
    @Inject(HOTEL_SERVICE_TOKEN)
    private readonly hotelRepositories: IHotelRepositories,
  ) { }

  async execute(name: string) {
    const hotel = await this.hotelRepositories.findHotelByName(name);
    return hotel;
  }
}
