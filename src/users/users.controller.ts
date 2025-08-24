import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Post,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './users.service';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserVm } from './users.vm';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  AccountRequest,
  TAccountRequest,
} from '../decorators/account-request.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { HttpCode, HttpStatus } from '@nestjs/common';
import { ApiUnauthorizedResponse, ApiForbiddenResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { ResponseMessage } from '../decorators/response-message.decorator';  
  
@ApiTags('users')
@Controller('users')
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get current user information',
    description: 'Retrieves the currently authenticated user\'s information.'
  })
  @ApiOkResponse({
    description: 'Successfully retrieved current user information',
    type: UserVm,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ResponseMessage('Get current user information success')
  async getCurrentUser(@AccountRequest() account: TAccountRequest) {
    return await this.userService.findOne(account.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ type: UserVm, description: 'Returns the user information' })
  @ApiResponse({ status: 403, description: 'You can only view your own information' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id') id: string,
    @AccountRequest() account: TAccountRequest,
  ) {
    // Only allow users to view their own information
    // if (id !== account.id) {
    //   throw new ForbiddenException('You can only view your own information');
    // }
    return await this.userService.findOne(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update user information' })
  @ApiCreatedResponse({
    type: UserVm,
    description: 'User information updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or email/phone already taken',
  })
  @ApiResponse({
    status: 403,
    description: 'You can only update your own information',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    // @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @AccountRequest() account: TAccountRequest,
  ) {
    // Only allow users to update their own information
    // if (id !== account.id) {
    //   throw new ForbiddenException('You can only update your own information');
    // }
    return await this.userService.update(account.id, updateUserDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Change user password',
    description: 'Changes the current user\'s password.'
  })
  @ApiBody({ 
    type: ChangePasswordDto,
    description: 'Current and new password information',
  })
  @ApiOkResponse({ 
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully' }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid current password or new passwords do not match'
  })
  @ApiForbiddenResponse({
    description: 'You can only change your own password'
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @AccountRequest() account: TAccountRequest,
  ) {
    // Only allow users to change their own password
    // if (account.id !== changePasswordDto.id) {
    //   throw new ForbiddenException('You can only change your own password');
    // }
    await this.userService.changePassword(account.id, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @Delete('')
  @ApiOperation({ summary: 'Delete user' })
  @ApiOkResponse({ type: UserVm, description: 'User deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'You can only delete your own account',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @AccountRequest() account: TAccountRequest,
  ) {
    // Only allow users to delete their own account
    // if (id !== account.id) {
    //   throw new ForbiddenException('You can only delete your own account');
    // }
    return await this.userService.remove(account.id);
  }
}
