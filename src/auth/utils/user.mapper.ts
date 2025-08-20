import { User } from '@prisma/client';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export function mapUserToDto(user: User): UserResponseDto {
  return new UserResponseDto({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  });
}
