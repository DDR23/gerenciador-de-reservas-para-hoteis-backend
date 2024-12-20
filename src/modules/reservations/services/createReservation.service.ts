import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateReservationDto } from '../domain/dto/create-reservation.dto';
import { differenceInDays } from 'date-fns';
import { IReservationRepositories } from '../domain/repositories/IReservation.repositories';
import { MailerService } from '@nestjs-modules/mailer';
import { createOwnerEmail, createUserEmail } from '../utils/templateHTML';
import { FindHotelByIdService } from 'src/modules/hotels/services/findHotelById.service';
import { FindUserByIdService } from 'src/modules/users/services/findUserById.service';
import { RESERVATION_SERVICE_TOKEN } from '../utils/reservationServiceToken';

@Injectable()
export class CreateReservationService {
  constructor(
    @Inject(RESERVATION_SERVICE_TOKEN)
    private readonly reservationRepositories: IReservationRepositories,
    private readonly findHotelByIdService: FindHotelByIdService,
    private readonly findUserByIdService: FindUserByIdService,
    private readonly mailerService: MailerService,
  ) { }

  async execute(id: number, data: CreateReservationDto) {
    const { RESERVATION_CHECKIN, RESERVATION_CHECKOUT, FK_RESERVATION_HOTEL_ID } = data;
    if (RESERVATION_CHECKIN >= RESERVATION_CHECKOUT) throw new BadRequestException('Check-out date must ba after check-in date');
    const daysOfStay = differenceInDays(RESERVATION_CHECKIN, RESERVATION_CHECKOUT);
    const hotel = await this.findHotelByIdService.execute(FK_RESERVATION_HOTEL_ID);
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (typeof hotel.HOTEL_PRICE !== 'number' || hotel.HOTEL_PRICE <= 0) throw new BadRequestException('Invalid hotel price');
    const total = daysOfStay * hotel.HOTEL_PRICE;
    const newReservation = {
      ...data,
      RESERVATION_CHECKIN,
      RESERVATION_CHECKOUT,
      RESERVATION_TOTAL: total, // TODO - total nao pode ficar negativo
      FK_RESERVATION_USER_ID: id,
    };
    const hotelOwner = await this.findUserByIdService.execute(hotel.FK_HOTEL_OWNER_ID);
    await this.mailerService.sendMail({
      to: hotelOwner.USER_EMAIL,
      subject: 'Pending Reservation Approval',
      html: createOwnerEmail(hotelOwner.USER_NAME),
    })
    const user = await this.findUserByIdService.execute(id);
    await this.mailerService.sendMail({
      to: user.USER_EMAIL,
      subject: 'Pending Reservation Approval',
      html: createUserEmail(user.USER_NAME),
    })
    return await this.reservationRepositories.createReservation(newReservation)
  }
}
