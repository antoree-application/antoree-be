import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserVm } from './users.vm';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SecutiryUtils } from '../utils/security.util';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  private toUserVm(user: User): UserVm {
    return {
      id: user.id,
      email: user.email,
      password: '*********',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findOne(id: string): Promise<UserVm> {
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.toUserVm(user);
  }

  async findByEmail(email: string): Promise<UserVm> {
    const user = await this.prismaService.user.findUnique({
      where: { email: email },
    });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return this.toUserVm(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserVm> {
    // Check if user exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if email is being updated and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prismaService.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (emailExists && emailExists.id !== id) {
        throw new BadRequestException('Email is already taken');
      }
    }

    const user = await this.prismaService.user.update({
      where: { id },
      data: updateUserDto,
    });
    return this.toUserVm(user);
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify current password
    const isPasswordValid = SecutiryUtils.decodePassword(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Verify new passwords match
    if (changePasswordDto.newPassword !== changePasswordDto.confirmNewPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // Hash new password using SecurityUtils
    const hashedPassword = await SecutiryUtils.hashingPassword(changePasswordDto.newPassword);

    // Update password
    await this.prismaService.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async remove(id: string): Promise<UserVm> {
    // Get user data before deletion
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete the user (cascade deletes will handle related Student/Teacher records)
    await this.prismaService.user.delete({
      where: { id },
    });

    return this.toUserVm(user);
  }
}
